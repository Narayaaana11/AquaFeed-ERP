import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/forms";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { validationRules } from "@/lib/validations";
import { Building2, Users, Plus, Pencil, Trash2, X, ShieldAlert, Eye, EyeOff, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCompanySettings,
  useUpdateCompany,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useClearCompanyData,
} from "@/hooks/useSettings";

const tabs = ["Company", "Users & Roles"] as const;
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

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [showClearPassword, setShowClearPassword] = useState(false);
  const [clearPasswordError, setClearPasswordError] = useState('');

  // Company form
  const {
    register: registerCompany,
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
    handleSubmit: handleAddEmployeeSubmit,
    reset: resetAddEmployee,
    formState: { errors: addEmployeeErrors },
  } = useForm<EmployeeFormData>({ mode: "onBlur" });

  // Edit employee form
  const {
    register: registerEditEmployee,
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
                      });
                    }
                  }}
                  className="h-10 px-6 rounded-lg border border-border text-sm font-display font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          )}

          {isOwner && (
            <div className="mt-8 border border-destructive/20 bg-destructive/5 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                <h3 className="font-display font-bold text-destructive text-sm">Danger Zone — Owner Only</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Irreversibly delete all products, invoices, customers, and expenses for this company workspace.
                This is useful if you want to clear demo data and start fresh. <strong>Requires your account password.</strong>
              </p>
              <button
                type="button"
                onClick={handleOpenClearConfirm}
                className="h-10 px-6 rounded-lg bg-destructive text-white text-sm font-display font-semibold hover:bg-destructive/90 transition-colors shadow-sm"
              >
                Clear Workspace Data
              </button>
            </div>
          )}
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
            )}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {mounted && isAddEmployeeOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
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
                {...registerAddEmployee("role", {
                  required: "Role is required",
                })}
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
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
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
                {...registerEditEmployee("role", {
                  required: "Role is required",
                })}
                error={editEmployeeErrors.role}
              />

              <FormSelect
                label="Status"
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
                defaultValue={String(selectedEmployee.isActive)}
                {...registerEditEmployee("isActive", {
                  required: "Status is required",
                })}
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
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-surface rounded-2xl border border-destructive/30 shadow-panel w-full max-w-md p-6">
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
