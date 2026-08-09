"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getUser } from "@/lib/client-auth";
import { formatShortDateFA } from "@/lib/date";

interface Contact {
  id: number;
  name: string;
  phone: string;
  position?: string;
  organization?: string;
  createdAt: string;
  groups?: { id: number; name: string; color: string }[];
}

interface Group {
  id: number;
  name: string;
  description?: string;
  color: string;
  memberCount: number;
}

interface Campaign {
  id: number;
  title: string;
  message: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: string;
  sentAt?: string;
  createdAt: string;
  senderName: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const user = getUser();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"send" | "contacts" | "groups" | null>(null);

  // Search
  const [contactSearch, setContactSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<Group | null>(null);

  // Forms
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPosition, setContactPosition] = useState("");
  const [contactOrg, setContactOrg] = useState("");
  const [contactGroupIds, setContactGroupIds] = useState<number[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupColor, setGroupColor] = useState("#1e40af");

  // Send
  const [smsTitle, setSmsTitle] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [sendContactSearch, setSendContactSearch] = useState("");
  const [sendGroupSearch, setSendGroupSearch] = useState("");

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user?.isAdmin && !user?.canNotify) router.replace("/dashboard");
  }, [user, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, g, h] = await Promise.all([
        authFetch("/api/contacts").then(r => r.json()),
        authFetch("/api/contact-groups").then(r => r.json()),
        authFetch("/api/sms-campaigns").then(r => r.json()),
      ]);
      setContacts(c.contacts || []);
      setGroups(g.groups || []);
      setCampaigns(h.campaigns || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Filtered lists
  const filteredContacts = contacts.filter(c =>
    c.name.includes(contactSearch) || c.phone.includes(contactSearch) || (c.organization || "").includes(contactSearch)
  );
  const filteredGroups = groups.filter(g =>
    g.name.includes(groupSearch) || (g.description || "").includes(groupSearch)
  );
  const sendFilteredContacts = contacts.filter(c =>
    c.name.includes(sendContactSearch) || c.phone.includes(sendContactSearch)
  );
  const sendFilteredGroups = groups.filter(g =>
    g.name.includes(sendGroupSearch)
  );

  const resetContactForm = () => {
    setContactName(""); setContactPhone(""); setContactPosition(""); setContactOrg("");
    setContactGroupIds([]); setEditingContact(null); setError("");
  };
  const resetGroupForm = () => {
    setGroupName(""); setGroupDesc(""); setGroupColor("#1e40af"); setEditingGroup(null); setError("");
  };
  const openEditContact = (c: Contact) => {
    setEditingContact(c); setContactName(c.name); setContactPhone(c.phone);
    setContactPosition(c.position || ""); setContactOrg(c.organization || "");
    setContactGroupIds(c.groups?.map(g => g.id) || []);
    setShowContactModal(true);
  };
  const openEditGroup = (g: Group) => {
    setEditingGroup(g); setGroupName(g.name); setGroupDesc(g.description || ""); setGroupColor(g.color);
    setShowGroupModal(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setError("");
    try {
      const body = { name: contactName, phone: contactPhone, position: contactPosition, organization: contactOrg, groupIds: contactGroupIds };
      const res = editingContact
        ? await authFetch(`/api/contacts/${editingContact.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await authFetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || "خطا");
      setShowContactModal(false); resetContactForm();
      setSuccess(editingContact ? "مخاطب ویرایش شد" : "مخاطب اضافه شد");
      loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "خطا"); }
    setFormLoading(false);
  };
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setError("");
    try {
      const body = { name: groupName, description: groupDesc, color: groupColor };
      const res = editingGroup
        ? await authFetch(`/api/contact-groups/${editingGroup.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await authFetch("/api/contact-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || "خطا");
      setShowGroupModal(false); resetGroupForm();
      setSuccess(editingGroup ? "گروه ویرایش شد" : "گروه ایجاد شد");
      loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "خطا"); }
    setFormLoading(false);
  };
  const handleAddMembersToGroup = async (contactIds: number[]) => {
    if (!selectedGroupForMembers || contactIds.length === 0) return;
    try {
      const res = await authFetch(`/api/contact-groups/${selectedGroupForMembers.id}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactIds })
      });
      if (!res.ok) throw new Error("خطا");
      setSuccess(`${contactIds.length} مخاطب به "${selectedGroupForMembers.name}" اضافه شد`);
      setShowAddMemberModal(false); setSelectedGroupForMembers(null); loadData();
    } catch { setError("خطا در افزودن اعضا"); }
  };
  const handleDeleteContact = async (c: Contact) => {
    if (!confirm(`حذف "${c.name}"؟`)) return;
    if ((await authFetch(`/api/contacts/${c.id}`, { method: "DELETE" })).ok) { setSuccess("مخاطب حذف شد"); loadData(); }
  };
  const handleDeleteGroup = async (g: Group) => {
    if (!confirm(`حذف گروه "${g.name}"؟`)) return;
    if ((await authFetch(`/api/contact-groups/${g.id}`, { method: "DELETE" })).ok) { setSuccess("گروه حذف شد"); loadData(); }
  };
  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true); setError("");
    try {
      const res = await authFetch("/api/sms-campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: smsTitle, message: smsMessage, contactIds: selectedContactIds, groupIds: selectedGroupIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      if (data.campaign.failedCount > 0 && data.campaign.sentCount === 0)
        setError("ارسال ناموفق. اتصال اینترنت سرور به کاوه‌نگار را بررسی کنید.");
      else if (data.campaign.failedCount > 0)
        setSuccess(`ارسال شد — موفق: ${data.campaign.sentCount} | ناموفق: ${data.campaign.failedCount}`);
      else
        setSuccess(`پیامک با موفقیت ارسال شد (${data.campaign.sentCount} پیامک)`);
      setSmsTitle(""); setSmsMessage(""); setSelectedContactIds([]); setSelectedGroupIds([]);
      setActiveSection(null); loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "خطا"); }
    setSending(false);
  };

  const colors = ["#1e40af", "#0f766e", "#7c3aed", "#be123c", "#c2410c", "#15803d", "#0369a1", "#6b21a8"];

  if (!user?.isAdmin && !user?.canNotify) return null;
  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" /></div>;

  /* ════════════════ SEARCH INPUT COMPONENT ════════════════ */
  const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div className="relative">
      <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition" />
    </div>
  );

  /* ════════════════ DASHBOARD ════════════════ */
  if (!activeSection) return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-l from-blue-800 to-blue-900 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          </div>
          <div><h1 className="text-xl font-bold text-white">سامانه اطلاع‌رسانی پیامکی</h1><p className="text-blue-200 text-sm">مدیریت مخاطبین، گروه‌ها و ارسال پیامک</p></div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-800 px-4 py-3 rounded-xl mb-5 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2"><svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>{success}</span>
          <button onClick={() => setSuccess("")} className="text-green-600 hover:text-green-800 text-lg leading-none">×</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-5 flex items-center justify-between text-sm">
          <span>{error}</span><button onClick={() => setError("")} className="text-red-500 text-lg leading-none">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "مخاطب", value: contacts.length, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "گروه", value: groups.length, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "پیامک ارسالی", value: campaigns.length, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "ارسال موفق", value: campaigns.reduce((a, c) => a + c.sentCount, 0), color: "text-green-700", bg: "bg-green-50" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { key: "send", title: "ارسال پیامک", desc: "ارسال پیامک به مخاطبین یا گروه‌ها", iconColor: "bg-blue-800", linkColor: "text-blue-700",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /> },
          { key: "contacts", title: "مخاطبین", desc: `${contacts.length} مخاطب ثبت شده`, iconColor: "bg-emerald-700", linkColor: "text-emerald-700",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
          { key: "groups", title: "گروه‌ها", desc: `${groups.length} گروه ایجاد شده`, iconColor: "bg-violet-700", linkColor: "text-violet-700",
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> },
        ].map(c => (
          <div key={c.key} onClick={() => setActiveSection(c.key as "send"|"contacts"|"groups")}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition cursor-pointer group overflow-hidden">
            <div className="p-6">
              <div className={`w-14 h-14 ${c.iconColor} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform`}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">{c.icon}</svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{c.title}</h3>
              <p className="text-sm text-slate-500">{c.desc}</p>
            </div>
            <div className="px-6 py-3 bg-slate-50 group-hover:bg-slate-100 transition"><span className={`text-sm ${c.linkColor} font-medium`}>ورود ←</span></div>
          </div>
        ))}
      </div>

      {/* Recent */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50"><h3 className="font-bold text-slate-800">آخرین ارسال‌ها</h3></div>
          {campaigns.slice(0, 5).map(c => (
            <div key={c.id} className="p-4 flex items-center justify-between border-t border-slate-100">
              <div className="flex-1 min-w-0"><p className="font-medium text-slate-800 text-sm">{c.title}</p><p className="text-xs text-slate-400 mt-0.5">{c.senderName} • {formatShortDateFA(c.sentAt || c.createdAt)}</p></div>
              <div className="mr-4 text-left">
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${c.status === "completed" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{c.sentCount}/{c.totalRecipients}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ════════════════ BACK BUTTON ════════════════ */
  const BackBtn = () => (
    <button onClick={() => { setActiveSection(null); setError(""); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-5 text-sm transition">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      بازگشت
    </button>
  );

  /* ════════════════ SEND SMS ════════════════ */
  if (activeSection === "send") return (
    <div className="max-w-4xl mx-auto">
      <BackBtn />
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-blue-800"><h2 className="text-lg font-bold text-white">ارسال پیامک جدید</h2></div>
        <form onSubmit={handleSendSms} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان پیامک <span className="text-red-400">*</span></label>
              <input type="text" value={smsTitle} onChange={e => setSmsTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition text-sm" placeholder="مثال: اطلاع‌رسانی جلسه" required />
            </div>
            <div className="flex items-end"><div className="bg-blue-50 rounded-xl p-3 w-full text-center"><p className="text-sm text-blue-700">گیرندگان: <strong>{selectedContactIds.length}</strong> مخاطب — <strong>{selectedGroupIds.length}</strong> گروه</p></div></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">متن پیامک <span className="text-red-400">*</span></label>
            <textarea value={smsMessage} onChange={e => setSmsMessage(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition text-sm h-28 resize-none" placeholder="متن پیامک..." required />
            <p className="text-xs text-slate-400 mt-1 text-left" dir="ltr">{smsMessage.length} chars</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">انتخاب مخاطبین</label>
              <SearchInput value={sendContactSearch} onChange={setSendContactSearch} placeholder="جستجوی مخاطب..." />
              <div className="mt-2 border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-white">
                {sendFilteredContacts.length === 0 ? <p className="p-4 text-sm text-slate-400 text-center">نتیجه‌ای نیست</p> :
                  sendFilteredContacts.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition">
                      <input type="checkbox" checked={selectedContactIds.includes(c.id)} onChange={() => setSelectedContactIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm flex-1 truncate">{c.name}</span><span className="text-xs text-slate-400">{c.phone}</span>
                    </label>
                  ))
                }
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">انتخاب گروه‌ها</label>
              <SearchInput value={sendGroupSearch} onChange={setSendGroupSearch} placeholder="جستجوی گروه..." />
              <div className="mt-2 border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-white">
                {sendFilteredGroups.length === 0 ? <p className="p-4 text-sm text-slate-400 text-center">نتیجه‌ای نیست</p> :
                  sendFilteredGroups.map(g => (
                    <label key={g.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition">
                      <input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={() => setSelectedGroupIds(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} /><span className="text-sm flex-1">{g.name}</span><span className="text-xs text-slate-400">{g.memberCount} عضو</span>
                    </label>
                  ))
                }
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={sending || (!selectedContactIds.length && !selectedGroupIds.length)} className="flex-1 bg-blue-800 hover:bg-blue-900 text-white font-medium py-3 rounded-xl transition disabled:opacity-40">{sending ? "در حال ارسال..." : "ارسال پیامک"}</button>
            <button type="button" onClick={() => setActiveSection(null)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-sm">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );

  /* ════════════════ CONTACTS ════════════════ */
  if (activeSection === "contacts") return (
    <div className="max-w-5xl mx-auto">
      <BackBtn />
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-emerald-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">مدیریت مخاطبین ({contacts.length})</h2>
          <button onClick={() => { resetContactForm(); setShowContactModal(true); }} className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">+ مخاطب جدید</button>
        </div>
        <div className="p-4 border-b border-slate-100">
          <SearchInput value={contactSearch} onChange={setContactSearch} placeholder="جستجوی نام، شماره، سازمان..." />
        </div>
        {filteredContacts.length === 0 ? (
          <div className="p-16 text-center"><p className="text-slate-400">{contactSearch ? "نتیجه‌ای یافت نشد" : "مخاطبی ثبت نشده"}</p>
            {!contactSearch && <button onClick={() => { resetContactForm(); setShowContactModal(true); }} className="mt-3 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-800 transition">+ افزودن</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="text-right p-3 font-medium">نام</th><th className="text-right p-3 font-medium">شماره</th><th className="text-right p-3 font-medium hidden md:table-cell">سمت</th><th className="text-right p-3 font-medium hidden lg:table-cell">سازمان</th><th className="text-right p-3 font-medium">گروه‌ها</th><th className="p-3 w-20"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-medium text-slate-800">{c.name}</td>
                    <td className="p-3 text-slate-500 font-mono text-xs" dir="ltr">{c.phone}</td>
                    <td className="p-3 text-slate-500 hidden md:table-cell">{c.position || "—"}</td>
                    <td className="p-3 text-slate-500 hidden lg:table-cell">{c.organization || "—"}</td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{c.groups?.map(g => <span key={g.id} className="text-xs px-2 py-0.5 rounded-lg text-white" style={{ backgroundColor: g.color }}>{g.name}</span>)}{(!c.groups || !c.groups.length) && <span className="text-xs text-slate-300">—</span>}</div></td>
                    <td className="p-3"><div className="flex gap-1 justify-end">
                      <button onClick={() => openEditContact(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="ویرایش"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => handleDeleteContact(c)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="حذف"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">{editingContact ? "ویرایش مخاطب" : "مخاطب جدید"}</h2><button onClick={() => setShowContactModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">✕</button></div>
            <form onSubmit={handleSaveContact} className="p-4 space-y-3">
              {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
              <div><label className="block text-xs font-medium text-slate-600 mb-1">نام <span className="text-red-400">*</span></label><input type="text" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white" required /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">شماره <span className="text-red-400">*</span></label><input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white" dir="ltr" placeholder="09123456789" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">سمت</label><input type="text" value={contactPosition} onChange={e => setContactPosition(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">سازمان</label><input type="text" value={contactOrg} onChange={e => setContactOrg(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white" /></div>
              </div>
              {groups.length > 0 && <div><label className="block text-xs font-medium text-slate-600 mb-2">گروه‌ها</label><div className="flex flex-wrap gap-1.5">{groups.map(g => <button key={g.id} type="button" onClick={() => setContactGroupIds(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${contactGroupIds.includes(g.id) ? "text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={contactGroupIds.includes(g.id) ? { backgroundColor: g.color } : {}}>{g.name}</button>)}</div></div>}
              <div className="flex gap-3 pt-1"><button type="submit" disabled={formLoading} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">{formLoading ? "..." : editingContact ? "ذخیره" : "افزودن"}</button><button type="button" onClick={() => setShowContactModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-sm">انصراف</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  /* ════════════════ GROUPS ════════════════ */
  if (activeSection === "groups") return (
    <div className="max-w-5xl mx-auto">
      <BackBtn />
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-violet-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">مدیریت گروه‌ها ({groups.length})</h2>
          <button onClick={() => { resetGroupForm(); setShowGroupModal(true); }} className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">+ گروه جدید</button>
        </div>
        <div className="p-4 border-b border-slate-100">
          <SearchInput value={groupSearch} onChange={setGroupSearch} placeholder="جستجوی نام گروه..." />
        </div>
        {filteredGroups.length === 0 ? (
          <div className="p-16 text-center"><p className="text-slate-400">{groupSearch ? "نتیجه‌ای یافت نشد" : "گروهی ایجاد نشده"}</p>
            {!groupSearch && <button onClick={() => { resetGroupForm(); setShowGroupModal(true); }} className="mt-3 bg-violet-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-800 transition">+ ایجاد گروه</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredGroups.map(g => (
              <div key={g.id} className="bg-slate-50 rounded-xl p-4 hover:bg-white hover:shadow-sm transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: g.color }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="flex-1"><h3 className="font-bold text-slate-800">{g.name}</h3><p className="text-xs text-slate-500">{g.memberCount} عضو</p></div>
                </div>
                {g.description && <p className="text-xs text-slate-500 mb-3">{g.description}</p>}
                <div className="flex gap-2 pt-3 border-t border-slate-200">
                  <button onClick={() => { setSelectedGroupForMembers(g); setShowAddMemberModal(true); }} className="flex-1 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium transition shadow-sm">+ افزودن عضو</button>
                  <button onClick={() => openEditGroup(g)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  <button onClick={() => handleDeleteGroup(g)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">{editingGroup ? "ویرایش گروه" : "گروه جدید"}</h2><button onClick={() => setShowGroupModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">✕</button></div>
            <form onSubmit={handleSaveGroup} className="p-4 space-y-3">
              {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}
              <div><label className="block text-xs font-medium text-slate-600 mb-1">نام <span className="text-red-400">*</span></label><input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white" required /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">توضیحات</label><input type="text" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-2">رنگ</label><div className="flex gap-2 flex-wrap">{colors.map(cl => <button key={cl} type="button" onClick={() => setGroupColor(cl)} className={`w-8 h-8 rounded-lg transition ${groupColor === cl ? "ring-2 ring-offset-2 ring-slate-300 scale-110" : "hover:scale-105"}`} style={{ backgroundColor: cl }} />)}</div></div>
              <div className="flex gap-3 pt-1"><button type="submit" disabled={formLoading} className="flex-1 bg-violet-700 hover:bg-violet-800 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50">{formLoading ? "..." : editingGroup ? "ذخیره" : "ایجاد"}</button><button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-sm">انصراف</button></div>
            </form>
          </div>
        </div>
      )}
      {/* Add Members */}
      {showAddMemberModal && selectedGroupForMembers && <AddMembersModal group={selectedGroupForMembers} contacts={contacts} onClose={() => { setShowAddMemberModal(false); setSelectedGroupForMembers(null); }} onAdd={handleAddMembersToGroup} />}
    </div>
  );
  return null;
}

/* ════════════════ ADD MEMBERS MODAL ════════════════ */
function AddMembersModal({ group, contacts, onClose, onAdd }: { group: { id: number; name: string; color: string }; contacts: { id: number; name: string; phone: string; groups?: { id: number }[] }[]; onClose: () => void; onAdd: (ids: number[]) => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const existingIds = contacts.filter(c => c.groups?.some(g => g.id === group.id)).map(c => c.id);
  const available = contacts.filter(c => !existingIds.includes(c.id) && (c.name.includes(search) || c.phone.includes(search)));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0"><div><h2 className="font-bold">افزودن عضو</h2><p className="text-xs text-slate-500">{group.name}</p></div><button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">✕</button></div>
        <div className="p-3 border-b flex-shrink-0"><input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="جستجو..." /></div>
        <div className="flex-1 overflow-y-auto p-3">{available.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">{search ? "نتیجه‌ای نیست" : "همه عضو هستند"}</p> :
          available.map(c => (
            <label key={c.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} className="w-4 h-4 text-violet-600 rounded" />
              <div className="flex-1"><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>
            </label>
          ))
        }</div>
        <div className="p-3 border-t flex-shrink-0"><button onClick={() => onAdd(selected)} disabled={!selected.length} className="w-full bg-violet-700 hover:bg-violet-800 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-40">افزودن {selected.length > 0 ? `(${selected.length})` : ""}</button></div>
      </div>
    </div>
  );
}
