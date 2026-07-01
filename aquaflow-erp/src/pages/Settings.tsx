import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/forms";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { validationRules } from "@/lib/validations";
import { Building2, Users, Plus, Pencil, Trash2, X, ShieldAlert, Eye, EyeOff, Upload, Database, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCompanySettings,
  useUpdateCompany,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useClearCompanyData,
  useSyncTally,
  useUpdateCompanyOrder,
} from "@/hooks/useSettings";
import { useCompany } from "@/context/CompanyContext";

const tabs = ["Company", "Company Organization", "Users & Roles"] as const;
type Tab = (typeof tabs)[number];

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Sales Staff" | "Accountant";
  isActive: boolean;
}

interface CompanyData {
  companyName: string;
  gstNumber: string;
  phone: string;
  email: string;
  address: string;
  state: string;
}

interface EmployeeFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  isActive: boolean;
}

const roleColor: Record<string, string> = {
  Owner: "bg-brand-light text-brand",
  Manager: "bg-secondary text-foreground",
  "Sales Staff": "bg-success/10 text-success",
  Accountant: "bg-warning/10 text-warning",
};

const roles = ["Owner", "Manager", "Sales Staff", "Accountant"];

export default function Settings() {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'Owner';

  const [tab, setTab] = useState<Tab>("Company");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const { data: company, isLoading: isCompanyLoading } = useCompanySettings();
  const updateCompanyMutation = useUpdateCompany();

  const { data: usersData, isLoading: isUsersLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const clearDataMutation = useClearCompanyData();
  const syncTallyMutation = useSyncTally();
  const updateCompanyOrderMutation = useUpdateCompanyOrder();
  const [syncStats, setSyncStats] = useState<any>(null);
  
  const { companies } = useCompany();
  const [companyOrders, setCompanyOrders] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    companies.forEach((c: any, index: number) => {
      initial[c._id] = c.sortOrder ?? index + 1;
    });
    setCompanyOrders(initial);
  }, [companies]);

  const handleSaveCompanyOrder = async () => {
    const updates = Object.entries(companyOrders).map(([id, order]) => ({
      _id: id,
      sortOrder: order,
    }));
    await updateCompanyOrderMutation.mutateAsync(updates);
  };

  const handleSyncTally = async () => {
    try {
      const res = await syncTallyMutation.mutateAsync();
      if (res.success && res.stats) {
        setSyncStats(res.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [showClearPassword, setShowClearPassword] = useState(false);
  const [clearPasswordError, setClearPasswordError] = useState('');

  // Company form
  const { register: registerCompany, control: controlCompany,
    handleSubmit: handleCompanySubmit,
    reset: resetCompany,
  } = useForm<CompanyData>();

  // Synchronize company profile form data when loaded
  useEffect(() => {
    if (company) {
      resetCompany({
        companyName: company.name || "",
        gstNumber: company.gstNumber || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
        state: company.state || "",
      });
      // Set logo preview if it exists
      if (company.logoUrl) {
        setLogoPreview(company.logoUrl);
      }
    }
  }, [company, resetCompany]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Logo size should be less than 5MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Add employee form
  const {
    register: registerAddEmployee,
    control: controlAddEmployee,
    handleSubmit: handleAddEmployeeSubmit,
    reset: resetAddEmployee,
    formState: { errors: addEmployeeErrors },
  } = useForm<EmployeeFormData>({ mode: "onBlur" });

  // Edit employee form
  const {
    register: registerEditEmployee,
    control: controlEditEmployee,
    handleSubmit: handleEditEmployeeSubmit,
    reset: resetEditEmployee,
    formState: { errors: editEmployeeErrors },
  } = useForm<EmployeeFormData>({ mode: "onBlur" });

  const onCompanySubmit = async (data: CompanyData) => {
    try {
      const updateData: any = {
        name: data.companyName,
        gstNumber: data.gstNumber,
        phone: data.phone,
        email: data.email,
        address: data.address,
        state: data.state,
      };

      // If a new logo file was selected, convert it to base64
      if (logoFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          updateData.logoUrl = reader.result;
          await updateCompanyMutation.mutateAsync(updateData);
          setLogoFile(null);
        };
        reader.readAsDataURL(logoFile);
      } else {
        await updateCompanyMutation.mutateAsync(updateData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onAddEmployeeSubmit = async (data: EmployeeFormData) => {
    try {
      await createUserMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password || "123456",
        role: data.role,
      });
      resetAddEmployee();
      setIsAddEmployeeOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const onEditEmployeeSubmit = async (data: EmployeeFormData) => {
    if (!selectedEmployee) return;
    try {
      await updateUserMutation.mutateAsync({
        id: selectedEmployee._id,
        name: data.name,
        role: data.role,
        isActive: String(data.isActive) === "true" || data.isActive === true,
      });
      resetEditEmployee();
      setIsEditEmployeeOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    resetEditEmployee({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      isActive: employee.isActive,
    });
    setIsEditEmployeeOpen(true);
  };

  const handleDeactivateEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      await updateUserMutation.mutateAsync({
        id: selectedEmployee._id,
        isActive: false,
      });
      setIsDeleteOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearData = async () => {
    if (!clearPassword.trim()) {
      setClearPasswordError('Password is required.');
      return;
    }
    setClearPasswordError('');
    try {
      await clearDataMutation.mutateAsync(clearPassword);
      setIsClearConfirmOpen(false);
      setClearPassword('');
    } catch (err: any) {
      // Show backend error in modal
      setClearPasswordError(err.response?.data?.message || 'Incorrect password.');
    }
  };

  const handleOpenClearConfirm = () => {
    setClearPassword('');
    setClearPasswordError('');
    setShowClearPassword(false);
    setIsClearConfirmOpen(true);
  };

  const employees = (usersData || []) as Employee[];

  return (
    <AppLayout title="Settings" subtitle="Configure your workspace">
      <PageHeader title="Settings" />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-display font-semibold border-b-2 transition-colors -mb-px ${tab === t
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {t === "Company" ? (
              <Building2 className="w-4 h-4" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            {t}
          </button>
        ))}
      </div>

      {tab === "Company" && (
        <div className="bg-surface rounded-xl border border-border shadow-card p-6 max-w-2xl">
          <p className="font-display font-semibold text-foreground mb-5">
            Company Information
          </p>
          {isCompanyLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
            </div>
          ) : (
            <div>
              {company && !company.state && (
                <div className="mb-5 p-4 rounded-lg bg-warning/10 border border-warning/20 flex gap-3 items-start">
                  <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-warning">Company State is not set!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Please set your company's state below for accurate GST split calculations (CGST/SGST vs IGST).
                      If left blank, calculations will default to intra-state tax (CGST + SGST).
                    </p>
                  </div>
                </div>
              )}
              <form
                onSubmit={handleCompanySubmit(onCompanySubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Company Name"
                    {...registerCompany("companyName", validationRules.name)}
                  />
                  <FormInput
                    label="GST Number"
                    {...registerCompany("gstNumber", validationRules.gst)}
                  />
                  <FormInput
                    label="Phone Number"
                    {...registerCompany("phone", validationRules.phone)}
                  />
                  <FormInput
                    label="Email Address"
                    type="email"
                    {...registerCompany("email", validationRules.email)}
                  />
                  <FormInput
                    label="State"
                    placeholder="Andhra Pradesh"
                    {...registerCompany("state", { required: "State is required" })}
                  />
                </div>
              <div>
                <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Address
                </label>
                <textarea
                  rows={3}
                  {...registerCompany("address", {
                    required: "Address is required",
                  })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 transition resize-none"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Company Logo
                </label>
                {logoPreview ? (
                  <div className="relative w-24 h-24 mb-3">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-brand hover:bg-brand/5 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Click to upload logo</span>
                    <span className="text-[10px] text-muted-foreground">Max 5MB (PNG, JPG, GIF)</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={updateCompanyMutation.isPending}
                  className="h-10 px-6 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {updateCompanyMutation.isPending ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (company) {
                      resetCompany({
                        companyName: company.name || "",
                        gstNumber: company.gstNumber || "",
                        phone: company.phone || "",
                        email: company.email || "",
                        address: company.address || "",
                        state: company.state || "",
                      });
                    }
                  }}
                  className="h-10 px-6 rounded-lg border border-border text-sm font-display font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
            </div>
          )}

          {isOwner && (
            <div className="mt-8 border border-border bg-surface rounded-xl p-5 shadow-card">
              <div className="flex items-center gap-2.5 mb-2">
                <Database className="w-5 h-5 text-brand" />
                <h3 className="font-display font-bold text-foreground text-sm">Tally Integration & Sync</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Synchronize customers, suppliers, products, warehouses, sales invoices, and purchase orders from your Tally ERP database loader utility directly into your MongoDB cloud space.
              </p>
              
              {syncStats && (
                <div className="mb-4 bg-background border border-border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Warehouses:</span>{' '}
                    <strong className="text-foreground">{syncStats.warehouses}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customers:</span>{' '}
                    <strong className="text-foreground">{syncStats.customers}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Suppliers:</span>{' '}
                    <strong className="text-foreground">{syncStats.suppliers}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Products:</span>{' '}
                    <strong className="text-foreground">{syncStats.products}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sales Invoices:</span>{' '}
                    <strong className="text-foreground">{syncStats.invoices}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Purchase Orders:</span>{' '}
                    <strong className="text-foreground">{syncStats.purchaseOrders}</strong>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSyncTally}
                disabled={syncTallyMutation.isPending}
                className={`h-10 px-6 rounded-lg text-white text-sm font-display font-semibold transition-colors shadow-sm flex items-center gap-2 ${syncTallyMutation.isPending ? "bg-brand/60 cursor-not-allowed" : "bg-brand hover:bg-brand/90"}`}
              >
                {syncTallyMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sync in progress... Please wait</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sync with Tally Now</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      )}

      {tab === "Company Organization" && isOwner && (
        <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden max-w-2xl">
          <div className="p-6 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">
              Company Organization
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Set a priority order (1, 2, 3...) for your companies. The company with order 1 will be set as your default when logging in, and the navigation dropdown will list them in this exact order.
            </p>
          </div>
          <div className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-6 py-3 text-left font-display font-semibold text-muted-foreground">Company Name</th>
                  <th className="px-6 py-3 text-left font-display font-semibold text-muted-foreground">Financial Period</th>
                  <th className="px-6 py-3 text-left font-display font-semibold text-muted-foreground w-32">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((c: any) => (
                  <tr key={c._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.startingFrom && c.booksFrom 
                        ? `${new Date(c.startingFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')} to ${new Date(c.booksFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')}` 
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="1"
                        value={companyOrders[c._id] || 1}
                        onChange={(e) => setCompanyOrders(prev => ({ ...prev, [c._id]: parseInt(e.target.value) || 1 }))}
                        className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border bg-background flex justify-end">
            <button
              onClick={handleSaveCompanyOrder}
              disabled={updateCompanyOrderMutation.isPending}
              className="h-9 px-6 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {updateCompanyOrderMutation.isPending ? "Saving..." : "Save Order"}
            </button>
          </div>
        </div>
      )}

      {tab === "Users & Roles" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {employees.length} team members in your workspace
            </p>
            <button
              onClick={() => setIsAddEmployeeOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          </div>
          <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
            {isUsersLoading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No team members found.
              </div>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="sm:hidden divide-y divide-border">
                  {employees.map((e) => (
                    <div key={e._id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold text-xs shrink-0">
                            {e.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{e.name}</p>
                            <p className="text-xs text-muted-foreground">{e.email}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColor[e.role] || "bg-secondary"}`}>
                          {e.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {e.isActive ? "Active" : "Inactive"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditEmployee(e)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          {e.isActive && (
                            <button
                              onClick={() => {
                                setSelectedEmployee(e);
                                setIsDeleteOpen(true);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Deactivate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-background">
                        {["Employee", "Email", "Role", "Status", "Actions"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((e) => (
                        <tr
                          key={e._id}
                          className="border-b border-border last:border-0 hover:bg-background transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold text-xs shrink-0">
                                {e.name.charAt(0)}
                              </div>
                              <span className="font-medium text-foreground">
                                {e.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs">
                            {e.email}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColor[e.role] || "bg-secondary"}`}
                            >
                              {e.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${e.isActive
                                  ? "bg-success/10 text-success"
                                  : "bg-muted text-muted-foreground"
                                }`}
                            >
                              {e.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditEmployee(e)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              {e.isActive && (
                                <button
                                  onClick={() => {
                                    setSelectedEmployee(e);
                                    setIsDeleteOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {mounted && isAddEmployeeOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-foreground">
                Add Employee
              </h2>
              <button
                onClick={() => setIsAddEmployeeOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAddEmployeeSubmit(onAddEmployeeSubmit)}
              className="space-y-4"
            >
              <FormInput
                label="Full Name"
                placeholder="Rajesh Kumar"
                {...registerAddEmployee("name", validationRules.name)}
                error={addEmployeeErrors.name}
              />

              <FormInput
                label="Email"
                type="email"
                placeholder="rajesh@aquafarm.com"
                {...registerAddEmployee("email", validationRules.email)}
                error={addEmployeeErrors.email}
              />

              <FormInput
                label="Password"
                type="password"
                placeholder="••••••"
                {...registerAddEmployee("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
                error={addEmployeeErrors.password}
              />

              <FormSelect
                label="Role"
                options={roles.map((r) => ({ value: r, label: r }))}
                name="role" control={controlAddEmployee} required
                error={addEmployeeErrors.role}
              />

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    "Add Employee"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Employee Modal */}
      {isEditEmployeeOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-foreground">
                Edit Employee
              </h2>
              <button
                onClick={() => setIsEditEmployeeOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleEditEmployeeSubmit(onEditEmployeeSubmit)}
              className="space-y-4"
            >
              <FormInput
                label="Full Name"
                defaultValue={selectedEmployee.name}
                {...registerEditEmployee("name", validationRules.name)}
                error={editEmployeeErrors.name}
              />

              <FormInput
                label="Email"
                type="email"
                defaultValue={selectedEmployee.email}
                disabled
                {...registerEditEmployee("email")}
                error={editEmployeeErrors.email}
              />

              <FormSelect
                label="Role"
                options={roles.map((r) => ({ value: r, label: r }))}
                defaultValue={selectedEmployee.role}
                name="role" control={controlEditEmployee} required
                error={editEmployeeErrors.role}
              />

              <FormSelect
                label="Status"
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
                defaultValue={String(selectedEmployee.isActive)}
                name="isActive" control={controlEditEmployee} required 
                error={editEmployeeErrors.isActive}
              />

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditEmployeeOpen(false);
                    setSelectedEmployee(null);
                  }}
                  className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Deactivate Employee"
        message={`Are you sure you want to deactivate ${selectedEmployee?.name}? They will no longer be able to log in to the ERP.`}
        confirmText="Deactivate"
        isDestructive
        isLoading={updateUserMutation.isPending}
        onConfirm={handleDeactivateEmployee}
        onCancel={() => {
          setIsDeleteOpen(false);
          setSelectedEmployee(null);
        }}
      />

      {/* Clear Data — Password Prompt Modal (Owner Only) */}
      {mounted && isClearConfirmOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-destructive/30 shadow-panel w-full sm:max-w-md p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">Clear Workspace Data</h2>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-5 text-xs text-destructive">
              ⚠️ All <strong>products, customers, invoices, inventory, and expenses</strong> will be permanently deleted
              from this workspace. Non-owner users and company settings will not be affected.
            </div>

            <div className="mb-2">
              <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Enter your owner password to confirm
              </label>
              <div className="relative">
                <input
                  type={showClearPassword ? 'text' : 'password'}
                  value={clearPassword}
                  onChange={(e) => { setClearPassword(e.target.value); setClearPasswordError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleClearData()}
                  placeholder="Your account password"
                  className={`w-full pr-10 px-3 py-2.5 rounded-lg border ${clearPasswordError ? 'border-destructive' : 'border-border'
                    } bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40 transition`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowClearPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showClearPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {clearPasswordError && (
                <p className="mt-1.5 text-xs text-destructive font-medium">{clearPasswordError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                disabled={clearDataMutation.isPending}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-display font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearData}
                disabled={clearDataMutation.isPending || !clearPassword.trim()}
                className="flex-1 h-10 rounded-lg bg-destructive text-white text-sm font-display font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {clearDataMutation.isPending ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  'Clear All Data'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
