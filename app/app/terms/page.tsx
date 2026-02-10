import SiteNav from '@/app/components/SiteNav'
import SiteFooter from '@/app/components/SiteFooter'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream-50">
      <SiteNav />

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 sm:px-10 pt-32 pb-16 sm:pt-40 sm:pb-24">
        <header className="mb-16">
          <p className="text-sm font-medium tracking-widest uppercase text-accent mb-4">Legal</p>
          <h1 className="font-[family-name:var(--font-serif)] text-[clamp(2.25rem,4vw,3.5rem)] leading-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-muted">Effective February 10, 2026</p>
        </header>

        <div className="space-y-12 text-[15px] leading-relaxed text-near-black/85">
          <section>
            <h2 className="font-semibold text-lg mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the PolicyFront website at policyfront.io and any associated services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service. We reserve the right to modify these Terms at any time. Continued use of the Service following any changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">2. Description of Service</h2>
            <p>
              PolicyFront is a policy media intelligence platform that aggregates publicly available legislative data, media coverage, and related information for monitoring and analysis purposes. The Service is designed for public affairs professionals, consultants, and other users who track policy and media developments. The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">3. Account Registration</h2>
            <p className="mb-4">
              Access to certain features of the Service requires account registration. By creating an account, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your password and account credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts at our sole discretion, with or without notice, for any reason, including violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">4. Subscription and Payment</h2>
            <div className="space-y-4">
              <p>
                Certain features of the Service are available only through paid subscription plans. By subscribing, you agree to pay all applicable fees as described at the time of purchase.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted">
                <li>Subscriptions renew automatically at the end of each billing period unless cancelled</li>
                <li>You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period</li>
                <li>We reserve the right to change pricing with 30 days&apos; advance notice</li>
                <li>Refunds are provided at our sole discretion and are not guaranteed</li>
                <li>Failure to pay may result in suspension or termination of your access</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">5. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law or regulation</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or any systems or networks connected to the Service</li>
              <li>Use automated systems (bots, scrapers, crawlers) to access the Service without our express written permission</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Resell, sublicense, or redistribute the Service or any data obtained through the Service without authorization</li>
              <li>Use the Service to harass, abuse, threaten, or intimidate any person</li>
              <li>Remove, alter, or obscure any proprietary notices on the Service</li>
              <li>Use the Service in any manner that could damage, disable, overburden, or impair our servers or networks</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">6. Intellectual Property</h2>
            <div className="space-y-4">
              <p>
                The Service, including its design, features, content, and underlying technology, is owned by PolicyFront and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.
              </p>
              <p>
                Media content displayed through the Service (articles, excerpts, headlines) remains the intellectual property of the original publishers. PolicyFront provides excerpts and links for informational and monitoring purposes under fair use principles. We do not claim ownership of third-party content.
              </p>
              <p>
                Data and reports you generate using the Service are yours. We claim no ownership over your monitoring configurations, topic selections, or custom analyses.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">7. Data Accuracy and Reliability</h2>
            <div className="space-y-4">
              <p>
                PolicyFront aggregates information from third-party sources. While we strive for accuracy, we make no representations or warranties regarding the accuracy, completeness, timeliness, or reliability of any information provided through the Service.
              </p>
              <p>
                The Service is not a substitute for professional legal, political, or strategic advice. Users should independently verify critical information before making decisions based on data obtained through the Service.
              </p>
              <p>
                Sentiment analysis and other AI-powered features are automated and may not accurately reflect the tone or intent of original content. These features are provided as analytical tools and should not be relied upon as definitive assessments.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">8. Limitation of Liability</h2>
            <div className="space-y-4">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, POLICYFRONT AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY.
              </p>
              <p>
                OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED DOLLARS ($100).
              </p>
              <p>
                SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IN SUCH JURISDICTIONS, OUR LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">9. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless PolicyFront and its officers, directors, employees, agents, affiliates, and licensors from and against all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any rights of another party; or (d) your violation of any applicable law or regulation.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">11. Termination</h2>
            <div className="space-y-4">
              <p>
                We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.
              </p>
              <p>
                Upon termination: (a) your right to use the Service will immediately cease; (b) we may delete your account and associated data after a reasonable retention period; (c) provisions of these Terms that by their nature should survive termination shall survive, including but not limited to Sections 6, 8, 9, 10, and 12.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">12. Governing Law and Disputes</h2>
            <div className="space-y-4">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions.
              </p>
              <p>
                Any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Polk County, Florida. You consent to the personal jurisdiction and venue of such courts.
              </p>
              <p>
                YOU AGREE THAT ANY CLAIMS MUST BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">13. Force Majeure</h2>
            <p>
              PolicyFront shall not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including but not limited to acts of God, natural disasters, pandemics, war, terrorism, government actions, power failures, internet disruptions, or third-party service provider failures.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">14. Severability</h2>
            <p>
              If any provision of these Terms is held to be unenforceable or invalid, such provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">15. Entire Agreement</h2>
            <p>
              These Terms, together with the Privacy Policy, constitute the entire agreement between you and PolicyFront regarding the Service and supersede all prior and contemporaneous agreements, proposals, and communications, whether oral or written.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">16. Contact</h2>
            <p>
              Questions about these Terms should be directed to{' '}
              <a href="mailto:legal@policyfront.io" className="text-accent hover:underline">legal@policyfront.io</a>.
            </p>
          </section>
        </div>
      </article>

      <SiteFooter />
    </main>
  )
}
