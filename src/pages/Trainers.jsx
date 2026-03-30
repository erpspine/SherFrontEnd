import { useState } from "react";
import {
  Search,
  Plus,
  Star,
  Mail,
  Phone,
  Calendar,
  Clock,
  Users,
  Award,
  MoreVertical,
  X,
  Check,
  Dumbbell,
} from "lucide-react";

const trainersData = [
  {
    id: 1,
    name: "Sarah Mitchell",
    email: "sarah.mitchell@gym.com",
    phone: "+1 234 567 890",
    specialization: "Yoga & Pilates",
    experience: "8 years",
    rating: 4.9,
    totalClients: 156,
    sessionsThisMonth: 48,
    status: "Available",
    avatar: "SM",
    schedule: ["Mon", "Wed", "Fri", "Sat"],
  },
  {
    id: 2,
    name: "Mike Rodriguez",
    email: "mike.rodriguez@gym.com",
    phone: "+1 234 567 891",
    specialization: "HIIT & CrossFit",
    experience: "6 years",
    rating: 4.8,
    totalClients: 134,
    sessionsThisMonth: 52,
    status: "In Session",
    avatar: "MR",
    schedule: ["Tue", "Thu", "Sat", "Sun"],
  },
  {
    id: 3,
    name: "Emma Thompson",
    email: "emma.thompson@gym.com",
    phone: "+1 234 567 892",
    specialization: "Spin & Cardio",
    experience: "5 years",
    rating: 4.7,
    totalClients: 98,
    sessionsThisMonth: 36,
    status: "Available",
    avatar: "ET",
    schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  {
    id: 4,
    name: "John Davis",
    email: "john.davis@gym.com",
    phone: "+1 234 567 893",
    specialization: "Strength Training",
    experience: "10 years",
    rating: 4.9,
    totalClients: 189,
    sessionsThisMonth: 64,
    status: "On Leave",
    avatar: "JD",
    schedule: ["Mon", "Wed", "Fri"],
  },
  {
    id: 5,
    name: "Lisa Wang",
    email: "lisa.wang@gym.com",
    phone: "+1 234 567 894",
    specialization: "Boxing & MMA",
    experience: "7 years",
    rating: 4.8,
    totalClients: 112,
    sessionsThisMonth: 44,
    status: "Available",
    avatar: "LW",
    schedule: ["Tue", "Thu", "Sat", "Sun"],
  },
  {
    id: 6,
    name: "Alex Johnson",
    email: "alex.johnson@gym.com",
    phone: "+1 234 567 895",
    specialization: "Swimming",
    experience: "4 years",
    rating: 4.6,
    totalClients: 76,
    sessionsThisMonth: 28,
    status: "In Session",
    avatar: "AJ",
    schedule: ["Mon", "Wed", "Fri", "Sun"],
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case "Available":
      return "bg-green-500/20 text-green-400";
    case "In Session":
      return "bg-blue-500/20 text-blue-400";
    case "On Leave":
      return "bg-amber-500/20 text-amber-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
};

const getSpecializationColor = (spec) => {
  if (spec.includes("Yoga")) return "from-purple-500 to-pink-500";
  if (spec.includes("HIIT") || spec.includes("CrossFit"))
    return "from-red-500 to-orange-500";
  if (spec.includes("Spin") || spec.includes("Cardio"))
    return "from-blue-500 to-cyan-500";
  if (spec.includes("Strength")) return "from-amber-500 to-yellow-500";
  if (spec.includes("Boxing")) return "from-red-600 to-red-400";
  return "from-green-500 to-teal-500";
};

export default function Trainers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  const filteredTrainers = trainersData.filter(
    (trainer) =>
      trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.specialization.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trainers</h1>
          <p className="text-slate-400 mt-1">
            Manage your gym trainers and their schedules
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-red-500/25"
        >
          <Plus className="w-4 h-4" />
          Add New Trainer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Trainers</p>
          <p className="text-2xl font-bold text-white mt-1">24</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Available Now</p>
          <p className="text-2xl font-bold text-green-400 mt-1">16</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Sessions Today</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">42</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Avg. Rating</p>
          <p className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1">
            4.8 <Star className="w-5 h-5 fill-amber-400" />
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-red-500/50 transition-colors max-w-md">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search trainers by name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
          />
        </div>
      </div>

      {/* Trainers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainers.map((trainer) => (
          <div
            key={trainer.id}
            className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700/50 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getSpecializationColor(trainer.specialization)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                >
                  {trainer.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {trainer.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {trainer.specialization}
                  </p>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span
                className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(trainer.status)}`}
              >
                {trainer.status}
              </span>
              <span className="flex items-center gap-1 text-sm text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                {trainer.rating}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Award className="w-4 h-4" />
                <span>{trainer.experience} experience</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users className="w-4 h-4" />
                <span>{trainer.totalClients} total clients</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>{trainer.sessionsThisMonth} sessions this month</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Schedule</p>
              <div className="flex gap-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => (
                    <span
                      key={day}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trainer.schedule.includes(day)
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-800 text-slate-600"
                      }`}
                    >
                      {day.charAt(0)}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedTrainer(trainer)}
                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                View Profile
              </button>
              <button className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                Schedule
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Trainer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                Add New Trainer
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="john.doe@gym.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="+1 234 567 890"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Specialization
                </label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                  <option value="">Select specialization</option>
                  <option value="yoga">Yoga & Pilates</option>
                  <option value="hiit">HIIT & CrossFit</option>
                  <option value="cardio">Spin & Cardio</option>
                  <option value="strength">Strength Training</option>
                  <option value="boxing">Boxing & MMA</option>
                  <option value="swimming">Swimming</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  placeholder="5"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
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
                Add Trainer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trainer Profile Modal */}
      {selectedTrainer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                Trainer Profile
              </h3>
              <button
                onClick={() => setSelectedTrainer(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getSpecializationColor(selectedTrainer.specialization)} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}
                >
                  {selectedTrainer.avatar}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white">
                    {selectedTrainer.name}
                  </h4>
                  <p className="text-slate-400">
                    {selectedTrainer.specialization}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedTrainer.status)}`}
                    >
                      {selectedTrainer.status}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {selectedTrainer.rating}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail className="w-5 h-5 text-slate-500" />
                  <span>{selectedTrainer.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Phone className="w-5 h-5 text-slate-500" />
                  <span>{selectedTrainer.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Award className="w-5 h-5 text-slate-500" />
                  <span>{selectedTrainer.experience} of experience</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {selectedTrainer.totalClients}
                    </p>
                    <p className="text-xs text-slate-400">Total Clients</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {selectedTrainer.sessionsThisMonth}
                    </p>
                    <p className="text-xs text-slate-400">Sessions/Month</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-slate-800">
              <button className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
                Edit Profile
              </button>
              <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                View Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
