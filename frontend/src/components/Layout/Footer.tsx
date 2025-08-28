import Logo from "../Logo/Logo";

export default function Footer() 
{
  return (
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <Logo expanded={true} />
              </div>
              <p className="text-gray-300">Smart traffic monitoring system for safer roads</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Violation Search</li>
                <li>Notifications</li>
                <li>Map View</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Help Guide</li>
                <li>FAQ</li>
                <li>Contact Us</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="text-gray-300 space-y-2 text-sm">
                <p>Email: support@trafficwatch.com</p>
                <p>Hotline: 1-800-TRAFFIC</p>
                <p>Address: Ho Chi Minh City, Vietnam</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>© 2024 TrafficWatch. All rights reserved.</p>
          </div>
        </div>
      </footer>
  );
}