import Logo from "../Logo/Logo";

export default function Footer() 
{
  return (
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4">
                <Logo expanded={true} />
              </div>
              <p className="text-gray-300">Smart traffic monitoring system for safer roads</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Violation Search</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Notifications</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Map View</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Help Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
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