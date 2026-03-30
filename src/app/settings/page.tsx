import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p className="text-gray-600 mb-6">
        Settings will be available in a future update. You will be able to manage your allergy profile and food preferences here.
      </p>
      <Link
        href="/"
        className="inline-block px-4 py-2 bg-black text-white rounded-lg font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        Back to Home
      </Link>
    </div>
  );
}
