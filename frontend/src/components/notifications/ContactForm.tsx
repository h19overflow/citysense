import { useState, useEffect } from "react";
import { Edit2, Save, Mail, Phone } from "lucide-react";

interface ContactFormProps {
  email: string;
  phone: string;
  onEmailChange: (email: string) => void;
  onPhoneChange: (phone: string) => void;
}

export function ContactForm({ email, phone, onEmailChange, onPhoneChange }: ContactFormProps) {
  const [isEditingEmail, setIsEditingEmail] = useState(!email);
  const [isEditingPhone, setIsEditingPhone] = useState(!phone);

  useEffect(() => {
    if (email) localStorage.setItem("notificationEmail", email);
  }, [email]);

  useEffect(() => {
    if (phone) localStorage.setItem("notificationPhone", phone);
  }, [phone]);

  function handlePhoneInput(value: string) {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 10) onPhoneChange(cleaned);
  }

  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              disabled={!isEditingEmail}
              placeholder="Enter your email"
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm disabled:bg-muted disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setIsEditingEmail(!isEditingEmail)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isEditingEmail ? <><Save className="w-4 h-4" /> Save</> : <><Edit2 className="w-4 h-4" /> Edit</>}
          </button>
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Mobile Number</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneInput(e.target.value)}
              disabled={!isEditingPhone}
              placeholder="10 digit mobile number"
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm disabled:bg-muted disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setIsEditingPhone(!isEditingPhone)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isEditingPhone ? <><Save className="w-4 h-4" /> Save</> : <><Edit2 className="w-4 h-4" /> Edit</>}
          </button>
        </div>
        {phone.length > 0 && phone.length < 10 && (
          <p className="text-sm text-red-600 mt-1">Please enter a valid 10 digit mobile number</p>
        )}
      </div>
    </div>
  );
}
