import { useState } from "react";
import {
  Search,
  Plus,
  Clock,
  Users,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  Check,
} from "lucide-react";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const classesData = [
  {
    id: 1,
    name: "Morning Yoga",
    trainer: "Sarah M.",
    time: "06:00 - 07:00",
    room: "Studio A",
    capacity: 20,
    enrolled: 18,
    day: "Monday",
    type: "Yoga",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: 2,
    name: "HIIT Explosion",
    trainer: "Mike R.",
    time: "07:30 - 08:30",
    room: "Main Hall",
    capacity: 25,
    enrolled: 24,
    day: "Monday",
    type: "HIIT",
    color: "from-red-500 to-orange-500",
  },
  {
    id: 3,
    name: "Spin Class",
    trainer: "Emma T.",
    time: "09:00 - 10:00",
    room: "Spin Room",
    capacity: 20,
    enrolled: 15,
    day: "Monday",
    type: "Cardio",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 4,
    name: "CrossFit WOD",
    trainer: "John D.",
    time: "10:30 - 11:30",
    room: "CrossFit Zone",
    capacity: 15,
    enrolled: 12,
    day: "Tuesday",
    type: "CrossFit",
    color: "from-amber-500 to-yellow-500",
  },
  {
    id: 5,
    name: "Boxing Basics",
    trainer: "Lisa W.",
    time: "12:00 - 13:00",
    room: "Boxing Ring",
    capacity: 12,
    enrolled: 10,
    day: "Tuesday",
    type: "Boxing",
    color: "from-red-600 to-red-400",
  },
  {
    id: 6,
    name: "Pilates Flow",
    trainer: "Sarah M.",
    time: "14:00 - 15:00",
    room: "Studio B",
    capacity: 15,
    enrolled: 14,
    day: "Wednesday",
    type: "Pilates",
    color: "from-teal-500 to-green-500",
  },
  {
    id: 7,
    name: "Strength Training",
    trainer: "John D.",
    time: "16:00 - 17:30",
    room: "Weight Room",
    capacity: 20,
    enrolled: 18,
    day: "Wednesday",
    type: "Strength",
    color: "from-gray-500 to-gray-600",
  },
  {
    id: 8,
    name: "Aqua Aerobics",
    trainer: "Alex J.",
    time: "18:00 - 19:00",
    room: "Pool",
    capacity: 25,
    enrolled: 20,
    day: "Thursday",
    type: "Swimming",
    color: "from-cyan-500 to-blue-500",
  },
];

const getClassTypeColor = (type) => {
  switch (type) {
    case "Yoga":
      return "bg-purple-500/20 text-purple-400";
    case "HIIT":
      return "bg-red-500/20 text-red-400";
    case "Cardio":
      return "bg-blue-500/20 text-blue-400";
    case "CrossFit":
      return "bg-amber-500/20 text-amber-400";
    case "Boxing":
      return "bg-red-600/20 text-red-400";
    case "Pilates":
      return "bg-teal-500/20 text-teal-400";
    case "Strength":
      return "bg-gray-500/20 text-gray-400";
    case "Swimming":
      return "bg-cyan-500/20 text-cyan-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
};

export default function Classes() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'schedule'

  const filteredClasses = classesData.filter((cls) => cls.day === selectedDay);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Classes</h1>
          <p className="text-slate-400 mt-1">
            Manage gym classes and schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-red-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("schedule")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "schedule"
                  ? "bg-red-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Schedule
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-red-500/25"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Classes</p>
          <p className="text-2xl font-bold text-white mt-1">156</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Classes Today</p>
          <p className="text-2xl font-bold text-green-400 mt-1">12</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Enrollments</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">1,842</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Avg. Attendance</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">87%</p>
        </div>
      </div>

      {/* Day Selector */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-white">March 2024</h3>
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                selectedDay === day
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25"
                  : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.length > 0 ? (
          filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden hover:border-slate-700/50 transition-all duration-300 group"
            >
              {/* Header with gradient */}
              <div className={`h-2 bg-gradient-to-r ${cls.color}`} />

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {cls.name}
                    </h3>
                    <p className="text-sm text-slate-400">with {cls.trainer}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${getClassTypeColor(cls.type)}`}
                  >
                    {cls.type}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{cls.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>{cls.room}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>
                      {cls.enrolled} / {cls.capacity} enrolled
                    </span>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Capacity</span>
                    <span
                      className={`font-medium ${
                        cls.enrolled >= cls.capacity
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {Math.round((cls.enrolled / cls.capacity) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${cls.color} rounded-full transition-all duration-500`}
                      style={{
                        width: `${(cls.enrolled / cls.capacity) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Participants Preview */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(4, cls.enrolled))].map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-slate-900 flex items-center justify-center text-xs text-white font-medium"
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                    {cls.enrolled > 4 && (
                      <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-300">
                        +{cls.enrolled - 4}
                      </div>
                    )}
                  </div>
                  {cls.enrolled < cls.capacity && (
                    <span className="text-xs text-green-400">
                      {cls.capacity - cls.enrolled} spots left
                    </span>
                  )}
                  {cls.enrolled >= cls.capacity && (
                    <span className="text-xs text-red-400">Class Full</span>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-800">
                  <button className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
                    View Details
                  </button>
                  <button className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                    Edit Class
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              No classes scheduled for {selectedDay}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Add a Class
            </button>
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                Add New Class
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
                  Class Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Morning Yoga"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Class Type
                  </label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">Select type</option>
                    <option value="yoga">Yoga</option>
                    <option value="hiit">HIIT</option>
                    <option value="cardio">Cardio</option>
                    <option value="crossfit">CrossFit</option>
                    <option value="boxing">Boxing</option>
                    <option value="pilates">Pilates</option>
                    <option value="strength">Strength</option>
                    <option value="swimming">Swimming</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Trainer
                  </label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">Select trainer</option>
                    <option value="sarah">Sarah M.</option>
                    <option value="mike">Mike R.</option>
                    <option value="emma">Emma T.</option>
                    <option value="john">John D.</option>
                    <option value="lisa">Lisa W.</option>
                    <option value="alex">Alex J.</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Room
                  </label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">Select room</option>
                    <option value="studio-a">Studio A</option>
                    <option value="studio-b">Studio B</option>
                    <option value="main-hall">Main Hall</option>
                    <option value="spin-room">Spin Room</option>
                    <option value="crossfit-zone">CrossFit Zone</option>
                    <option value="boxing-ring">Boxing Ring</option>
                    <option value="pool">Pool</option>
                    <option value="weight-room">Weight Room</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <button
                        key={day}
                        className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-sm hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        {day}
                      </button>
                    ),
                  )}
                </div>
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
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
