import { useState } from "react";
import {
  Search,
  Plus,
  Dumbbell,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  MoreVertical,
  X,
  Check,
  Package,
} from "lucide-react";

const equipmentData = [
  {
    id: 1,
    name: "Treadmill Pro X500",
    category: "Cardio",
    location: "Cardio Zone A",
    status: "Working",
    condition: "Excellent",
    lastMaintenance: "Feb 15, 2024",
    nextMaintenance: "Apr 15, 2024",
    purchaseDate: "Jan 10, 2023",
    warrantyUntil: "Jan 10, 2026",
  },
  {
    id: 2,
    name: "Spin Bike Elite",
    category: "Cardio",
    location: "Spin Room",
    status: "Working",
    condition: "Good",
    lastMaintenance: "Mar 01, 2024",
    nextMaintenance: "May 01, 2024",
    purchaseDate: "Mar 20, 2022",
    warrantyUntil: "Mar 20, 2025",
  },
  {
    id: 3,
    name: "Bench Press Station",
    category: "Strength",
    location: "Weight Room",
    status: "Working",
    condition: "Excellent",
    lastMaintenance: "Feb 28, 2024",
    nextMaintenance: "Apr 28, 2024",
    purchaseDate: "Jun 15, 2023",
    warrantyUntil: "Jun 15, 2026",
  },
  {
    id: 4,
    name: "Cable Machine Multi",
    category: "Strength",
    location: "Weight Room",
    status: "Maintenance",
    condition: "Fair",
    lastMaintenance: "Mar 10, 2024",
    nextMaintenance: "Mar 20, 2024",
    purchaseDate: "Apr 05, 2021",
    warrantyUntil: "Apr 05, 2024",
  },
  {
    id: 5,
    name: "Rowing Machine R200",
    category: "Cardio",
    location: "CrossFit Zone",
    status: "Working",
    condition: "Good",
    lastMaintenance: "Jan 20, 2024",
    nextMaintenance: "Mar 20, 2024",
    purchaseDate: "Aug 12, 2022",
    warrantyUntil: "Aug 12, 2025",
  },
  {
    id: 6,
    name: "Leg Press 45°",
    category: "Strength",
    location: "Weight Room",
    status: "Out of Order",
    condition: "Poor",
    lastMaintenance: "Dec 15, 2023",
    nextMaintenance: "Pending Repair",
    purchaseDate: "Feb 28, 2020",
    warrantyUntil: "Expired",
  },
  {
    id: 7,
    name: "Elliptical Trainer E700",
    category: "Cardio",
    location: "Cardio Zone B",
    status: "Working",
    condition: "Excellent",
    lastMaintenance: "Mar 05, 2024",
    nextMaintenance: "May 05, 2024",
    purchaseDate: "Nov 20, 2023",
    warrantyUntil: "Nov 20, 2026",
  },
  {
    id: 8,
    name: "Smith Machine Pro",
    category: "Strength",
    location: "Weight Room",
    status: "Working",
    condition: "Good",
    lastMaintenance: "Feb 01, 2024",
    nextMaintenance: "Apr 01, 2024",
    purchaseDate: "Jul 10, 2022",
    warrantyUntil: "Jul 10, 2025",
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case "Working":
      return "bg-green-500/20 text-green-400";
    case "Maintenance":
      return "bg-amber-500/20 text-amber-400";
    case "Out of Order":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
};

const getConditionColor = (condition) => {
  switch (condition) {
    case "Excellent":
      return "text-green-400";
    case "Good":
      return "text-blue-400";
    case "Fair":
      return "text-amber-400";
    case "Poor":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
};

const getCategoryColor = (category) => {
  switch (category) {
    case "Cardio":
      return "from-blue-500 to-cyan-500";
    case "Strength":
      return "from-red-500 to-orange-500";
    case "Flexibility":
      return "from-purple-500 to-pink-500";
    default:
      return "from-slate-500 to-slate-600";
  }
};

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredEquipment = equipmentData.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipment</h1>
          <p className="text-slate-400 mt-1">
            Manage gym equipment and maintenance schedules
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-red-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Equipment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Equipment</p>
              <p className="text-2xl font-bold text-white mt-1">86</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Working</p>
              <p className="text-2xl font-bold text-green-400 mt-1">78</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">In Maintenance</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">5</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Wrench className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Out of Order</p>
              <p className="text-2xl font-bold text-red-400 mt-1">3</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-red-500/50 transition-colors">
            <Search className="w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            {["All", "Cardio", "Strength", "Flexibility"].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-red-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden hover:border-slate-700/50 transition-all duration-300 group"
          >
            {/* Header with gradient */}
            <div
              className={`h-2 bg-gradient-to-r ${getCategoryColor(item.category)}`}
            />

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(item.category)} flex items-center justify-center`}
                  >
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {item.name}
                    </h3>
                    <p className="text-sm text-slate-400">{item.category}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(item.status)}`}
                >
                  {item.status}
                </span>
                <span
                  className={`text-sm font-medium ${getConditionColor(item.condition)}`}
                >
                  {item.condition}
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Location</span>
                  <span className="text-white">{item.location}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Last Maintenance</span>
                  <span className="text-white">{item.lastMaintenance}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Next Maintenance</span>
                  <span
                    className={`${item.nextMaintenance === "Pending Repair" ? "text-red-400" : "text-white"}`}
                  >
                    {item.nextMaintenance}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
                  View Details
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                  <Wrench className="w-4 h-4" />
                  Schedule
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Equipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                Add New Equipment
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Equipment Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Treadmill Pro X500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Category
                  </label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">Select category</option>
                    <option value="cardio">Cardio</option>
                    <option value="strength">Strength</option>
                    <option value="flexibility">Flexibility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Location
                  </label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">Select location</option>
                    <option value="cardio-a">Cardio Zone A</option>
                    <option value="cardio-b">Cardio Zone B</option>
                    <option value="weight-room">Weight Room</option>
                    <option value="crossfit">CrossFit Zone</option>
                    <option value="spin-room">Spin Room</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Warranty Until
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Condition
                </label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                <Check className="w-4 h-4" />
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
