export const metadata = {
  title: 'Privacy Policy - AI Content Generation Platform',
  description: 'Privacy Policy for AI Content Generation Platform',
}

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <p className="mb-4"><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us, including when you create an account, 
            use our services, or contact us for support. This may include your name, email address, 
            and any content you create or upload.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide, maintain, and improve our services</li>
            <li>Process your requests and transactions</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Information Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            without your consent, except as described in this policy or as required by law.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Your Rights</h2>
          <p className="mb-4">
            You have the right to access, update, or delete your personal information. You may also 
            request that we limit the processing of your information in certain circumstances.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us through our website.
          </p>
          
          <div className="mt-8 pt-4 border-t">
            <a href="/home" className="text-blue-600 hover:underline">← Back to Home</a>
          </div>
        </div>
      </div>
    </div>
  );
} 