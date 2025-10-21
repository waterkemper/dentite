import axios from 'axios';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { decryptIfPresent } from './credentialEncryption';

/**
 * DomainVerificationService
 * 
 * Manages SendGrid domain authentication for multi-tenant email sending.
 * Allows practices to authenticate their own domains for better deliverability
 * and branding.
 * 
 * Features:
 * - Initiate domain authentication with SendGrid
 * - Retrieve DNS records for domain verification
 * - Check verification status
 * - Generate DNS setup instructions
 */

interface DnsRecord {
  type: string; // CNAME, TXT, MX
  host: string;
  value: string;
  priority?: number;
}

interface DnsRecords {
  domain: string;
  records: DnsRecord[];
  instructions: string;
}

interface VerificationStatus {
  verified: boolean;
  status: string; // pending, verified, failed
  message: string;
  lastChecked: Date;
  records?: DnsRecord[];
}

interface DnsInstructions {
  domain: string;
  records: DnsRecord[];
  steps: string[];
  estimatedTime: string;
  supportUrl: string;
}

interface SendGridDomainResponse {
  id: number;
  user_id: number;
  subdomain: string;
  domain: string;
  username: string;
  ips: any[];
  custom_spf: boolean;
  default: boolean;
  legacy: boolean;
  automatic_security: boolean;
  valid: boolean;
  dns: {
    mail_cname: {
      valid: boolean;
      type: string;
      host: string;
      data: string;
    };
    dkim1: {
      valid: boolean;
      type: string;
      host: string;
      data: string;
    };
    dkim2: {
      valid: boolean;
      type: string;
      host: string;
      data: string;
    };
  };
}

export class DomainVerificationService {
  private sendGridApiUrl = 'https://api.sendgrid.com/v3';

  /**
   * Initiate domain verification process
   */
  async initiateDomainVerification(practiceId: string, domain: string): Promise<DnsRecords> {
    try {
      // Get practice's SendGrid API key
      const practice = await prisma.practice.findUnique({
        where: { id: practiceId },
        select: {
          sendgridApiKey: true,
          emailProvider: true,
        },
      });

      if (!practice) {
        throw new Error('Practice not found');
      }

      if (!practice.sendgridApiKey) {
        throw new Error('SendGrid API key not configured for this practice');
      }

      const apiKey = decryptIfPresent(practice.sendgridApiKey);
      if (!apiKey) {
        throw new Error('Failed to decrypt SendGrid API key');
      }

      // Validate domain format
      if (!this.isValidDomain(domain)) {
        throw new Error('Invalid domain format');
      }

      // Create authenticated domain in SendGrid
      const response = await axios.post<SendGridDomainResponse>(
        `${this.sendGridApiUrl}/whitelabel/domains`,
        {
          domain: domain,
          subdomain: 'em', // Email subdomain (e.g., em.yourclinic.com)
          automatic_security: true, // Enable automatic security features
          custom_spf: true, // Use custom SPF
          default: true, // Set as default domain
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const domainData = response.data;

      // Extract DNS records
      const dnsRecords: DnsRecord[] = [];

      // Add CNAME records
      if (domainData.dns.mail_cname) {
        dnsRecords.push({
          type: 'CNAME',
          host: domainData.dns.mail_cname.host,
          value: domainData.dns.mail_cname.data,
        });
      }

      if (domainData.dns.dkim1) {
        dnsRecords.push({
          type: 'CNAME',
          host: domainData.dns.dkim1.host,
          value: domainData.dns.dkim1.data,
        });
      }

      if (domainData.dns.dkim2) {
        dnsRecords.push({
          type: 'CNAME',
          host: domainData.dns.dkim2.host,
          value: domainData.dns.dkim2.data,
        });
      }

      // Update practice with DNS records and domain ID
      await prisma.practice.update({
        where: { id: practiceId },
        data: {
          sendgridDomainId: domainData.id.toString(),
          emailDnsRecords: dnsRecords as any,
          emailVerificationStatus: 'pending',
          emailDomainVerified: false,
        },
      });

      return {
        domain: domain,
        records: dnsRecords,
        instructions: 'Add these DNS records to your domain registrar or DNS provider. Verification may take up to 48 hours.',
      };
    } catch (error: any) {
      console.error('Domain verification initiation failed:', error.response?.data || error.message);
      
      if (error.response?.data?.errors) {
        throw new Error(error.response.data.errors[0]?.message || 'Failed to initiate domain verification');
      }
      
      throw new Error(error.message || 'Failed to initiate domain verification');
    }
  }

  /**
   * Check domain verification status with SendGrid
   */
  async checkVerificationStatus(practiceId: string): Promise<VerificationStatus> {
    try {
      // Get practice configuration
      const practice = await prisma.practice.findUnique({
        where: { id: practiceId },
        select: {
          sendgridApiKey: true,
          sendgridDomainId: true,
          emailDnsRecords: true,
          emailDomainVerified: true,
        },
      });

      if (!practice) {
        throw new Error('Practice not found');
      }

      if (!practice.sendgridDomainId) {
        return {
          verified: false,
          status: 'pending',
          message: 'Domain verification not started',
          lastChecked: new Date(),
        };
      }

      const apiKey = decryptIfPresent(practice.sendgridApiKey);
      if (!apiKey) {
        throw new Error('Failed to decrypt SendGrid API key');
      }

      // Validate the domain with SendGrid
      const response = await axios.post(
        `${this.sendGridApiUrl}/whitelabel/domains/${practice.sendgridDomainId}/validate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const validationData = response.data;
      const isVerified = validationData.valid === true;

      // Update practice verification status
      await prisma.practice.update({
        where: { id: practiceId },
        data: {
          emailDomainVerified: isVerified,
          emailVerificationStatus: isVerified ? 'verified' : 'pending',
        },
      });

      return {
        verified: isVerified,
        status: isVerified ? 'verified' : 'pending',
        message: isVerified 
          ? 'Domain verified successfully! You can now send emails from your domain.'
          : 'Domain verification pending. DNS records may take up to 48 hours to propagate.',
        lastChecked: new Date(),
        records: (practice.emailDnsRecords as unknown as DnsRecord[]) || [],
      };
    } catch (error: any) {
      console.error('Verification status check failed:', error.response?.data || error.message);
      
      return {
        verified: false,
        status: 'failed',
        message: error.response?.data?.errors?.[0]?.message || 'Failed to check verification status',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Get DNS instructions for domain setup
   */
  async getDnsInstructions(practiceId: string): Promise<DnsInstructions> {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        emailDnsRecords: true,
        sendgridFromEmail: true,
      },
    });

    if (!practice) {
      throw new Error('Practice not found');
    }

    if (!practice.emailDnsRecords) {
      throw new Error('Domain verification not initiated. Please configure your domain first.');
    }

    const records = practice.emailDnsRecords as unknown as DnsRecord[];
    const domain = practice.sendgridFromEmail?.split('@')[1] || 'your-domain.com';

    return {
      domain: domain,
      records: records,
      steps: [
        '1. Log in to your domain registrar or DNS provider (e.g., GoDaddy, Cloudflare, Namecheap)',
        '2. Navigate to DNS management or DNS settings',
        '3. Add the CNAME records shown below',
        '4. Save your changes',
        '5. Wait for DNS propagation (typically 15 minutes to 48 hours)',
        '6. Return here and click "Check Verification" to verify',
      ],
      estimatedTime: '15 minutes to 48 hours',
      supportUrl: 'https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication',
    };
  }

  /**
   * Delete domain authentication
   */
  async deleteDomainAuthentication(practiceId: string): Promise<void> {
    try {
      const practice = await prisma.practice.findUnique({
        where: { id: practiceId },
        select: {
          sendgridApiKey: true,
          sendgridDomainId: true,
        },
      });

      if (!practice || !practice.sendgridDomainId) {
        throw new Error('No domain authentication found');
      }

      const apiKey = decryptIfPresent(practice.sendgridApiKey);
      if (apiKey) {
        // Attempt to delete from SendGrid (best effort)
        try {
          await axios.delete(
            `${this.sendGridApiUrl}/whitelabel/domains/${practice.sendgridDomainId}`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
              },
            }
          );
        } catch (error) {
          console.warn('Failed to delete domain from SendGrid (may already be deleted)');
        }
      }

      // Clear domain configuration from database
      await prisma.practice.update({
        where: { id: practiceId },
        data: {
          sendgridDomainId: null,
          emailDnsRecords: Prisma.JsonNull,
          emailVerificationStatus: null,
          emailDomainVerified: false,
        },
      });
    } catch (error: any) {
      console.error('Failed to delete domain authentication:', error.message);
      throw error;
    }
  }

  /**
   * Get list of authenticated domains for a practice
   */
  async getAuthenticatedDomains(practiceId: string): Promise<any[]> {
    try {
      const practice = await prisma.practice.findUnique({
        where: { id: practiceId },
        select: {
          sendgridApiKey: true,
        },
      });

      if (!practice?.sendgridApiKey) {
        return [];
      }

      const apiKey = decryptIfPresent(practice.sendgridApiKey);
      if (!apiKey) {
        return [];
      }

      const response = await axios.get(
        `${this.sendGridApiUrl}/whitelabel/domains`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      return response.data || [];
    } catch (error) {
      console.error('Failed to get authenticated domains:', error);
      return [];
    }
  }

  // Helper methods

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }
}

// Singleton instance
let verificationInstance: DomainVerificationService | null = null;

/**
 * Get the singleton verification service instance
 */
export function getDomainVerification(): DomainVerificationService {
  if (!verificationInstance) {
    verificationInstance = new DomainVerificationService();
  }
  return verificationInstance;
}

