import { useState } from "react";
import {
  Check,
  Star,
  Zap,
  Crown,
  Clock,
  Users,
  Dumbbell,
  Sparkles,
  X,
  Edit,
  Trash2,
  Plus,
  Sun,
} from "lucide-react";

const plansData = [
  {
    id: 1,
    name: "Daily",
    duration: "1 Day",
    price: 10000,
    originalPrice: 15000,
    popular: false,
    color: "from-emerald-500 to-teal-500",
    icon: Sun,
    features: [
      "Full gym access",
      "Basic equipment usage",
      "Locker room access",
    ],
    notIncluded: [
      "Fitness assessment",
      "Personal trainer sessions",
      "Group classes",
      "Spa & sauna access",
      "Nutrition consultation",
    ],
    subscribers: 2450,
  },
  {
    id: 2,
    name: "Monthly",
    duration: "1 Month",
    price: 49000,
    originalPrice: 59000,
    popular: false,
    color: "from-blue-500 to-cyan-500",
    icon: Clock,
    features: [
      "Full gym access",
      "Basic equipment usage",
      "Locker room access",
      "1 Free fitness assessment",
      "Access to mobile app",
    ],
    notIncluded: [
      "Personal trainer sessions",
      "Group classes",
      "Spa & sauna access",
      "Nutrition consultation",
    ],
    subscribers: 1200,
  },
  {
    id: 3,
    name: "Quarterly",
    duration: "3 Months",
    price: 129000,
    originalPrice: 177000,
    popular: true,
    color: "from-red-500 to-orange-500",
    icon: Zap,
    features: [
      "Full gym access",
      "All equipment usage",
      "Locker room access",
      "3 Free fitness assessments",
      "Access to mobile app",
      "2 Personal trainer sessions/month",
      "Unlimited group classes",
      "Spa & sauna access",
    ],
    notIncluded: ["Nutrition consultation"],
    subscribers: 890,
    savings: 48000,
  },
  {
    id: 4,
    name: "Annual",
    duration: "12 Months",
    price: 449000,
    originalPrice: 588000,
    popular: false,
    color: "from-amber-500 to-yellow-500",
    icon: Crown,
    features: [
      "Full gym access",
      "All equipment usage",
      "Locker room access",
      "Monthly fitness assessments",
      "Access to mobile app",
      "4 Personal trainer sessions/month",
      "Unlimited group classes",
      "Spa & sauna access",
      "Nutrition consultation",
      "Guest passes (2/month)",
      "Priority booking",
      "Exclusive member events",
    ],
    notIncluded: [],
    subscribers: 547,
    savings: 139000,
  },
];

const statsData = [
  { label: "Total Active Subscriptions", value: "2,637", change: "+12%" },
  { label: "Monthly Revenue", value: "Tsh 48,250,000", change: "+18%" },
  { label: "Most Popular Plan", value: "Quarterly", change: "" },
  { label: "Avg. Retention Rate", value: "87%", change: "+5%" },
];

export default function MembershipPlans() {
  const [plans, setPlans] = useState(plansData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Membership Plans</h1>
          <p className="text-slate-400 mt-1">
            Manage your gym membership plans and pricing
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-red-500/25"
        >
          <Plus className="w-4 h-4" />
          Add New Plan
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <div
            key={index}
            className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4"
          >
            <p className="text-slate-400 text-sm">{stat.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              {stat.change && (
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-slate-900/50 backdrop-blur border rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
              plan.popular
                ? "border-red-500/50 shadow-lg shadow-red-500/10"
                : "border-slate-800/50 hover:border-slate-700/50"
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full text-white text-xs font-semibold">
                <Star className="w-3 h-3 fill-white" />
                Most Popular
              </div>
            )}

            {/* Header */}
            <div className={`h-2 bg-gradient-to-r ${plan.color}`} />

            <div className="p-6">
              {/* Plan Icon & Name */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}
                >
                  <plan.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-400">{plan.duration}</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">
                    Tsh {plan.price.toLocaleString()}
                  </span>
                  <span className="text-slate-400">
                    /{plan.duration.toLowerCase()}
                  </span>
                </div>
                {plan.originalPrice > plan.price && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-500 line-through">
                      Tsh {plan.originalPrice.toLocaleString()}
                    </span>
                    {plan.savings && (
                      <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                        Save Tsh {plan.savings.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Subscribers Count */}
              <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
                <Users className="w-4 h-4" />
                <span>
                  {plan.subscribers.toLocaleString()} active subscribers
                </span>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  What's included
                </p>
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 opacity-50"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <X className="w-3 h-3 text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-500">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Plan
                </button>
                <button className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Plan Comparison</h3>
          <p className="text-sm text-slate-400">
            Compare features across all membership plans
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400">
                  Features
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className="text-center py-4 px-6 text-sm font-semibold text-white"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{plan.name}</span>
                      <span className="text-slate-400 font-normal">
                        Tsh {plan.price.toLocaleString()}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: "Gym Access",
                  daily: true,
                  monthly: true,
                  quarterly: true,
                  annual: true,
                },
                {
                  name: "All Equipment",
                  daily: false,
                  monthly: false,
                  quarterly: true,
                  annual: true,
                },
                {
                  name: "Group Classes",
                  daily: false,
                  monthly: false,
                  quarterly: true,
                  annual: true,
                },
                {
                  name: "Personal Trainer",
                  daily: false,
                  monthly: false,
                  quarterly: "2/month",
                  annual: "4/month",
                },
                {
                  name: "Spa & Sauna",
                  daily: false,
                  monthly: false,
                  quarterly: true,
                  annual: true,
                },
                {
                  name: "Nutrition Consultation",
                  daily: false,
                  monthly: false,
                  quarterly: false,
                  annual: true,
                },
                {
                  name: "Guest Passes",
                  daily: false,
                  monthly: false,
                  quarterly: false,
                  annual: "2/month",
                },
                {
                  name: "Priority Booking",
                  daily: false,
                  monthly: false,
                  quarterly: false,
                  annual: true,
                },
              ].map((feature, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30"
                >
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {feature.name}
                  </td>
                  {["daily", "monthly", "quarterly", "annual"].map(
                    (planKey) => (
                      <td key={planKey} className="py-4 px-6 text-center">
                        {typeof feature[planKey] === "boolean" ? (
                          feature[planKey] ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-slate-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm text-amber-400 font-medium">
                            {feature[planKey]}
                          </span>
                        )}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Plan Modal */}
      {(isModalOpen || selectedPlan) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900">
              <h3 className="text-lg font-semibold text-white">
                {selectedPlan ? "Edit Plan" : "Add New Plan"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPlan(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  defaultValue={selectedPlan?.name || ""}
                  placeholder="e.g., Monthly, Quarterly, Annual"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Duration
                  </label>
                  <select
                    defaultValue={selectedPlan?.duration || ""}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="">Select duration</option>
                    <option value="1 Day">1 Day</option>
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="12 Months">12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Price (Tsh)
                  </label>
                  <input
                    type="number"
                    defaultValue={selectedPlan?.price || ""}
                    placeholder="49000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Original Price (Tsh)
                  </label>
                  <input
                    type="number"
                    defaultValue={selectedPlan?.originalPrice || ""}
                    placeholder="59000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Color Theme
                  </label>
                  <select
                    defaultValue={
                      selectedPlan?.color || "from-blue-500 to-cyan-500"
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="from-blue-500 to-cyan-500">Blue</option>
                    <option value="from-red-500 to-orange-500">
                      Red/Orange
                    </option>
                    <option value="from-amber-500 to-yellow-500">Gold</option>
                    <option value="from-purple-500 to-pink-500">Purple</option>
                    <option value="from-green-500 to-emerald-500">Green</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Features (one per line)
                </label>
                <textarea
                  rows={5}
                  defaultValue={selectedPlan?.features.join("\n") || ""}
                  placeholder="Full gym access&#10;Locker room access&#10;Mobile app access"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="popular"
                  defaultChecked={selectedPlan?.popular || false}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500"
                />
                <label htmlFor="popular" className="text-sm text-slate-300">
                  Mark as "Most Popular" plan
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedPlan(null);
                }}
                className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity">
                <Check className="w-4 h-4" />
                {selectedPlan ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
