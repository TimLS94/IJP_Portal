import { useState } from 'react';
import { Mail, Facebook, ChevronRight } from 'lucide-react';
import ColdOutreach from './sales/ColdOutreach';
import FacebookGroups from './sales/FacebookGroups';

const menuItems = [
  { id: 'cold-outreach', label: 'Kaltakquise E-Mails', icon: Mail },
  { id: 'facebook', label: 'Facebook Gruppen', icon: Facebook },
];

function SalesLayout() {
  const [activeSection, setActiveSection] = useState('cold-outreach');

  const renderContent = () => {
    switch (activeSection) {
      case 'cold-outreach':
        return <ColdOutreach />;
      case 'facebook':
        return <FacebookGroups />;
      default:
        return <ColdOutreach />;
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0">
        <div className="card sticky top-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vertrieb</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-orange-100 text-orange-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 text-orange-400" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}

export default SalesLayout;
