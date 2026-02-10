import SiteNav from '@/app/components/SiteNav'
import SiteFooter from '@/app/components/SiteFooter'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream-50">
      <SiteNav />

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 sm:px-10 pt-32 pb-16 sm:pt-40 sm:pb-24">
        <header className="mb-16">
          <p className="text-sm font-medium tracking-widest uppercase text-accent mb-4">Legal</p>
          <h1 className="font-[family-name:var(--font-serif)] text-[clamp(2.25rem,4vw,3.5rem)] leading-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted">Effective February 10, 2026</p>
        </header>

        <div className="space-y-12 text-[15px] leading-relaxed text-near-black/85">
          <section>
            <h2 className="font-semibold text-lg mb-4">1. Who We Are</h2>
            <p>
              PolicyFront (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the PolicyFront.io website and associated services (collectively, the &quot;Service&quot;). This Privacy Policy describes how we collect, use, disclose, and protect your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Information You Provide</h3>
                <ul className="list-disc pl-5 space-y-2 text-muted">
                  <li>Account registration information (name, email address, password)</li>
                  <li>Waitlist signup information (email address)</li>
                  <li>Topics, keywords, and monitoring preferences you configure</li>
                  <li>Communications you send to us (support requests, feedback)</li>
                  <li>Payment information (processed by third-party payment processors; we do not store payment card details)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Information Collected Automatically</h3>
                <ul className="list-disc pl-5 space-y-2 text-muted">
                  <li>Device and browser information (type, operating system, screen resolution)</li>
                  <li>IP address and approximate geolocation</li>
                  <li>Usage data (pages visited, features used, timestamps)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Information From Third-Party Sources</h3>
                <ul className="list-disc pl-5 space-y-2 text-muted">
                  <li>Publicly available legislative data from government databases</li>
                  <li>Publicly available media content from news outlets and publications</li>
                  <li>Journalist and outlet information derived from public reporting</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted">
              <li>To provide, maintain, and improve the Service</li>
              <li>To create and manage your account</li>
              <li>To deliver monitoring alerts, digests, and notifications</li>
              <li>To process transactions and send related information</li>
              <li>To respond to your comments, questions, and support requests</li>
              <li>To send administrative information (service updates, security alerts)</li>
              <li>To detect, prevent, and address technical issues, fraud, or illegal activity</li>
              <li>To comply with legal obligations</li>
              <li>To enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">4. How We Share Your Information</h2>
            <p className="mb-4">
              We do not sell your personal information. We may share information in the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted">
              <li><strong className="text-near-black">Service Providers:</strong> With third parties who perform services on our behalf (hosting, analytics, payment processing, email delivery)</li>
              <li><strong className="text-near-black">Legal Requirements:</strong> When required by law, subpoena, court order, or governmental request</li>
              <li><strong className="text-near-black">Protection of Rights:</strong> To protect the rights, property, or safety of PolicyFront, our users, or others</li>
              <li><strong className="text-near-black">Business Transfers:</strong> In connection with a merger, acquisition, reorganization, or sale of assets</li>
              <li><strong className="text-near-black">With Your Consent:</strong> When you have given us explicit permission</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide the Service. We will retain and use your information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements. Monitoring data (media mentions, legislative records) may be retained indefinitely as part of the historical record of the Service. You may request deletion of your account and associated personal data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">6. Data Security</h2>
            <p>
              We implement commercially reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These include encryption in transit (TLS/SSL), encryption at rest, access controls, and regular security assessments. However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">7. Your Rights</h2>
            <p className="mb-4">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict processing of your information</li>
              <li>Data portability (receive your data in a structured format)</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at <a href="mailto:privacy@policyfront.io" className="text-accent hover:underline">privacy@policyfront.io</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">8. Cookies</h2>
            <p>
              We use essential cookies required for the Service to function (authentication, session management). We may use analytics cookies to understand how the Service is used. You can control cookie preferences through your browser settings. Disabling essential cookies may prevent you from using certain features of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">9. Third-Party Services</h2>
            <p>
              The Service may contain links to third-party websites, services, or content. We are not responsible for the privacy practices or content of these third parties. We encourage you to review the privacy policies of any third-party services you access through our Service. Third-party services we use include Supabase (database and authentication), Vercel (hosting), and Firecrawl (web content indexing).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">11. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence, including the United States. These countries may have different data protection laws. By using the Service, you consent to the transfer of your information to such countries.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Effective&quot; date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-4">13. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@policyfront.io" className="text-accent hover:underline">privacy@policyfront.io</a>.
            </p>
          </section>
        </div>
      </article>

      <SiteFooter />
    </main>
  )
}
