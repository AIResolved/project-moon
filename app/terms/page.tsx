export const metadata = {
  title: 'Terms of Service - AI Content Generation Platform',
  description: 'Terms of Service for AI Content Generation Platform',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <a href="/home" className="text-lg hover:underline">AI Content Generator</a>
            </div>
          </div>
        </nav>
        
        <div className="flex-1 w-full max-w-4xl mx-auto p-6 prose prose-sm max-w-none">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          
          <p className="mb-4"><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using this AI Content Generation Platform, you accept and agree to be bound by 
            the terms and provision of this agreement. If you do not agree to these terms, please do not use our service.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Use License</h2>
          <p className="mb-4">
            Permission is granted to temporarily use our service for personal, non-commercial transitory viewing only. 
            This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>modify or copy the materials</li>
            <li>use the materials for any commercial purpose or for any public display</li>
            <li>attempt to reverse engineer any software contained on our service</li>
            <li>remove any copyright or other proprietary notations from the materials</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">User Content</h2>
          <p className="mb-4">
            You retain ownership of any content you submit, post, or display on or through our service. 
            By submitting content, you grant us a license to use, modify, publicly perform, publicly display, 
            reproduce, and distribute such content.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Prohibited Uses</h2>
          <p className="mb-4">
            You may not use our service:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>For any unlawful purpose or to solicit others to unlawful acts</li>
            <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
            <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
            <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
            <li>To submit false or misleading information</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Service Availability</h2>
          <p className="mb-4">
            Our service is provided "as is" and "as available" without any warranties of any kind. 
            We do not guarantee that our service will be available at all times or that it will be error-free.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Limitation of Liability</h2>
          <p className="mb-4">
            In no event shall our company or its suppliers be liable for any damages (including, without limitation, 
            damages for loss of data or profit, or due to business interruption) arising out of the use or inability 
            to use our service.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Privacy Policy</h2>
          <p className="mb-4">
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of our service, 
            to understand our practices.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Modifications</h2>
          <p className="mb-4">
            We may revise these terms of service at any time without notice. By using our service, 
            you are agreeing to be bound by the then current version of these terms of service.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Contact Information</h2>
          <p className="mb-4">
            If you have any questions about these Terms of Service, please contact us through our website.
          </p>
          
          <div className="mt-8 pt-4 border-t">
            <a href="/home" className="text-blue-600 hover:underline">← Back to Home</a>
          </div>
        </div>
      </div>
    </div>
  );
} 