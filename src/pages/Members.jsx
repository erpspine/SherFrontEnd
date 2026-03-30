import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  User,
  Shield,
  Building2,
  FileText,
} from "lucide-react";

const membersData = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 234 567 890",
    gender: "Female",
    plan: "Premium",
    status: "Active",
    joined: "Jan 15, 2024",
    expiry: "Jan 15, 2025",
    avatar: "SJ",
    hasInsurance: true,
    insurance: {
      provider: "Blue Cross Blue Shield",
      policyNumber: "BCBS-2024-78234",
      expiryDate: "Dec 31, 2025",
      coverageType: "Full Coverage",
    },
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@email.com",
    phone: "+1 234 567 891",
    gender: "Male",
    plan: "Standard",
    status: "Active",
    joined: "Feb 20, 2024",
    expiry: "Feb 20, 2025",
    avatar: "MC",
    hasInsurance: false,
    insurance: null,
  },
  {
    id: 3,
    name: "Emma Wilson",
    email: "emma.wilson@email.com",
    phone: "+1 234 567 892",
    gender: "Female",
    plan: "VIP",
    status: "Active",
    joined: "Mar 10, 2024",
    expiry: "Mar 10, 2025",
    avatar: "EW",
    hasInsurance: true,
    insurance: {
      provider: "Aetna Health",
      policyNumber: "AET-2024-45123",
      expiryDate: "Jun 30, 2025",
      coverageType: "Premium",
    },
  },
  {
    id: 4,
    name: "James Brown",
    email: "james.brown@email.com",
    phone: "+1 234 567 893",
    gender: "Male",
    plan: "Basic",
    status: "Inactive",
    joined: "Dec 05, 2023",
    expiry: "Dec 05, 2024",
    avatar: "JB",
    hasInsurance: false,
    insurance: null,
  },
  {
    id: 5,
    name: "Lisa Anderson",
    email: "lisa.anderson@email.com",
    phone: "+1 234 567 894",
    gender: "Female",
    plan: "Premium",
    status: "Active",
    joined: "Apr 22, 2024",
    expiry: "Apr 22, 2025",
    avatar: "LA",
    hasInsurance: true,
    insurance: {
      provider: "United Healthcare",
      policyNumber: "UHC-2024-99876",
      expiryDate: "Mar 15, 2026",
      coverageType: "Basic",
    },
  },
  {
    id: 6,
    name: "David Martinez",
    email: "david.martinez@email.com",
    phone: "+1 234 567 895",
    gender: "Male",
    plan: "Standard",
    status: "Pending",
    joined: "May 01, 2024",
    expiry: "May 01, 2025",
    avatar: "DM",
    hasInsurance: false,
    insurance: null,
  },
  {
    id: 7,
    name: "Jennifer Taylor",
    email: "jennifer.taylor@email.com",
    phone: "+1 234 567 896",
    gender: "Female",
    plan: "VIP",
    status: "Active",
    joined: "Jan 30, 2024",
    expiry: "Jan 30, 2025",
    avatar: "JT",
    hasInsurance: true,
    insurance: {
      provider: "Cigna",
      policyNumber: "CIG-2024-33456",
      expiryDate: "Sep 30, 2025",
      coverageType: "Full Coverage",
    },
  },
  {
    id: 8,
    name: "Robert Garcia",
    email: "robert.garcia@email.com",
    phone: "+1 234 567 897",
    gender: "Male",
    plan: "Basic",
    status: "Active",
    joined: "Jun 15, 2024",
    expiry: "Jun 15, 2025",
    avatar: "RG",
    hasInsurance: false,
    insurance: null,
  },
];

const getPlanColor = (plan) => {
  switch (plan) {
    case "VIP":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Premium":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "Standard":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Active":
      return "bg-green-500/20 text-green-400";
    case "Inactive":
      return "bg-red-500/20 text-red-400";
    case "Pending":
      return "bg-yellow-500/20 text-yellow-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
};

export default function Members() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const filteredMembers = membersData.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === "All" || member.plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Members</h1>
          <p className="text-slate-400 mt-1">
            Manage your gym members and their subscriptions
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-red-500/25"
        >
          <Plus className="w-4 h-4" />
          Add New Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Members</p>
          <p className="text-2xl font-bold text-white mt-1">2,847</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Active Members</p>
          <p className="text-2xl font-bold text-green-400 mt-1">2,584</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">New This Month</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">127</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Expired Memberships</p>
          <p className="text-2xl font-bold text-red-400 mt-1">43</p>
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
              placeholder="Search members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
            />
          </div>

          {/* Plan Filter */}
          <div className="flex gap-2">
            {["All", "Basic", "Standard", "Premium", "VIP"].map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedPlan === plan
                    ? "bg-red-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {plan}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400">
                  Member
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400">
                  Contact
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400">
                  Plan
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400">
                  Status
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400">
                  Joined
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400">
                  Expiry
                </th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          ID: #{member.id.toString().padStart(4, "0")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-300 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {member.email}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        {member.phone}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex px-3 py-1 rounded-lg text-xs font-medium border ${getPlanColor(member.plan)}`}
                    >
                      {member.plan}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(member.status)}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          member.status === "Active"
                            ? "bg-green-400"
                            : member.status === "Inactive"
                              ? "bg-red-400"
                              : "bg-yellow-400"
                        }`}
                      />
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-400">
                      {member.joined}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-400">
                      {member.expiry}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
          <p className="text-sm text-slate-400">
            Showing <span className="text-white font-medium">1</span> to{" "}
            <span className="text-white font-medium">8</span> of{" "}
            <span className="text-white font-medium">2,847</span> members
          </p>
          <div className="flex items-center gap-2">
            <button
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              disabled
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {[1, 2, 3, "...", 356].map((page, index) => (
              <button
                key={index}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === 1
                    ? "bg-red-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {page}
              </button>
            ))}
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                Add New Member
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
                  placeholder="john.doe@email.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    Gender
                  </label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Membership Plan
                </label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                  <option value="">Select a plan</option>
                  <option value="basic">Basic - Tsh 29,000/month</option>
                  <option value="standard">Standard - Tsh 49,000/month</option>
                  <option value="premium">Premium - Tsh 79,000/month</option>
                  <option value="vip">VIP - Tsh 149,000/month</option>
                </select>
              </div>

              {/* Insurance Section */}
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-slate-400" />
                  <label className="text-sm font-medium text-slate-300">
                    Insurance Information (Optional)
                  </label>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Insurance Provider
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Blue Cross Blue Shield"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Policy Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., BCBS-2024-12345"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Policy Expiry
                      </label>
                      <input
                        type="date"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Coverage Type
                    </label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors">
                      <option value="">Select coverage type</option>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="full">Full Coverage</option>
                    </select>
                  </div>
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
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                Member Details
              </h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                  {selectedMember.avatar}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white">
                    {selectedMember.name}
                  </h4>
                  <p className="text-slate-400">
                    Member ID: #{selectedMember.id.toString().padStart(4, "0")}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail className="w-5 h-5 text-slate-500" />
                  <span>{selectedMember.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Phone className="w-5 h-5 text-slate-500" />
                  <span>{selectedMember.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <User className="w-5 h-5 text-slate-500" />
                  <span>Gender: {selectedMember.gender}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <span>Joined: {selectedMember.joined}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-slate-400">Membership Plan</span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium border ${getPlanColor(selectedMember.plan)}`}
                  >
                    {selectedMember.plan}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(selectedMember.status)}`}
                  >
                    {selectedMember.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Expiry Date</span>
                  <span className="text-white">{selectedMember.expiry}</span>
                </div>

                {/* Insurance Section */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-semibold text-white">
                      Insurance Details
                    </span>
                  </div>
                  {selectedMember.hasInsurance && selectedMember.insurance ? (
                    <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-slate-400">
                            Provider
                          </span>
                        </div>
                        <span className="text-sm text-white font-medium">
                          {selectedMember.insurance.provider}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-slate-400">
                            Policy #
                          </span>
                        </div>
                        <span className="text-sm text-white font-mono">
                          {selectedMember.insurance.policyNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-slate-400">
                            Valid Until
                          </span>
                        </div>
                        <span className="text-sm text-white">
                          {selectedMember.insurance.expiryDate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Coverage</span>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
                          {selectedMember.insurance.coverageType}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/30 rounded-xl p-4 text-center">
                      <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        No insurance on file
                      </p>
                      <button className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors">
                        + Add Insurance
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-slate-800">
              <button className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
                Edit Member
              </button>
              <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                Renew Membership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
