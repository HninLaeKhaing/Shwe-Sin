'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  getLocalStorageKey,
  hasCloudSync,
  InventoryItem,
  loadInventoryFromCloud,
  normalizeScopeKey,
  normalizeShopCode,
  parseInventoryPayload,
  replaceInventoryInCloud,
  serializeInventory,
} from '@/lib/inventory-sync';

type Language = 'en' | 'my';

type SyncState = 'loading' | 'cloud' | 'local' | 'error';

const DEFAULT_SHOP_CODE = 'main-shop';
const ACTIVE_SHOP_CODE_KEY = 'shwe-sin-active-shop';
const PIN_REGEX = /^\d{4,8}$/;

const copy = {
  en: {
    brand: 'Shwe Sin Shopkeeper',
    headline: 'Keep inventory safe with a shop PIN',
    subheadline: 'A simple Android-friendly inventory app for small shopkeepers.',
    lockedTitle: 'Unlock shop',
    lockedHint: 'Use the same shop code and PIN to open the same inventory on another device.',
    shopCodeLabel: 'Shop code',
    shopCodeHint: 'Use letters, numbers, hyphen, or underscore.',
    pinLabel: 'PIN',
    pinHint: '4 to 8 digits. Keep it private.',
    unlockButton: 'Unlock shop',
    currentShop: 'Current shop',
    lockButton: 'Lock shop',
    addTitle: 'Add or edit item',
    addHint: 'Save a photo, name, amount, and price. Changes stay in this protected shop.',
    searchTitle: 'Quick search',
    searchHint: 'Type to see the item price instantly.',
    maintenanceTitle: 'Data maintenance',
    maintenanceHint: 'Back up, restore, clear, or switch the protected shop.',
    emptyState: 'No items yet. Add your first product above.',
    noMatch: 'No matching items found.',
    saveButton: 'Save item',
    updateButton: 'Update item',
    cancelButton: 'Cancel edit',
    searchPlaceholder: 'Search item name',
    loadShop: 'Load shop',
    syncReady: 'Cloud sync ready',
    syncLocal: 'Local storage only',
    syncError: 'Cloud sync error',
    syncLoading: 'Loading shop data',
    itemName: 'Item name',
    amount: 'Amount',
    price: 'Price',
    photo: 'Photo',
    language: 'Language',
    english: 'English',
    burmese: 'Burmese',
    totalItems: 'Total items',
    totalStock: 'Total stock',
    inventoryValue: 'Inventory value',
    amountUnit: 'pcs',
    priceUnit: 'Ks',
    itemCard: 'Price',
    editItem: 'Edit',
    deleteItem: 'Delete',
    exportBackup: 'Export backup',
    importBackup: 'Import backup',
    clearAll: 'Clear all',
    lastSaved: 'Auto-saved on this device and cloud-synced when available',
    editingLabel: 'Editing item',
    savedItem: 'Item saved.',
    updatedItem: 'Item updated.',
    deletedItem: 'Item deleted.',
    clearedItems: 'Inventory cleared.',
    importedItems: (count: number) => `${count} item(s) restored.`,
    exportReady: 'Backup downloaded.',
    importFailed: 'Backup file could not be read.',
    invalidForm: 'Please enter a valid name, amount, and price.',
    confirmDelete: 'Delete this item?',
    confirmClear: 'Clear all saved items?',
    cloudSyncFailed: 'Cloud sync failed. Local data kept safe.',
    loadedFromCloud: 'Loaded from cloud.',
    loadedFromLocal: 'Loaded from local storage.',
    loadedEmpty: 'No inventory found for this shop code yet.',
    shopLoaded: 'Shop loaded.',
    invalidPin: 'PIN must be 4 to 8 digits.',
    unlocked: 'Shop unlocked.',
    locked: 'Shop locked.',
  },
  my: {
    brand: 'Shwe Sin ဆိုင်ရှင်အတွက်',
    headline: 'Shop PIN နဲ့ inventory ကို လုံခြုံအောင်ထားပါ',
    subheadline: 'Android ဖုန်းပေါ်မှာ လွယ်ကူသုံးနိုင်တဲ့ ဆိုင်ပစ္စည်း စီမံခန့်ခွဲမှု web app ဖြစ်ပါတယ်။',
    lockedTitle: 'Shop ဖွင့်ရန်',
    lockedHint: 'တူညီတဲ့ shop code နဲ့ PIN ကို သုံးရင် တူညီတဲ့ inventory ကို အခြားဖုန်းမှာလည်း ဖွင့်နိုင်ပါတယ်။',
    shopCodeLabel: 'Shop code',
    shopCodeHint: 'အက္ခရာ, နံပါတ်, hyphen, underscore သာသုံးပါ။',
    pinLabel: 'PIN',
    pinHint: 'ဂဏန်း ၄ မှ ၈ လုံး။ လျှို့ဝှက်ထားပါ။',
    unlockButton: 'Shop ဖွင့်မည်',
    currentShop: 'လက်ရှိ shop',
    lockButton: 'Shop ပိတ်မည်',
    addTitle: 'ပစ္စည်းထည့် / ပြင်ရန်',
    addHint: 'ပုံ, နာမည်, အရေအတွက်, ဈေးနှုန်း ထည့်ပါ။ ဒီ protected shop ထဲမှာ သိမ်းထားမယ်။',
    searchTitle: 'အမြန်ရှာရန်',
    searchHint: 'နာမည်ရိုက်ထည့်ပြီး ဈေးကို ချက်ချင်းကြည့်ပါ။',
    maintenanceTitle: 'ဒေတာထိန်းသိမ်းမှု',
    maintenanceHint: 'Backup ထုတ်၊ ပြန်ထည့်၊ ရှင်းလင်း၊ သို့မဟုတ် protected shop ကို ပြောင်းနိုင်ပါတယ်။',
    emptyState: 'ပစ္စည်းမရှိသေးပါ။ အပေါ်ကနေ ပထမဆုံးပစ္စည်းကို ထည့်ပါ။',
    noMatch: 'ကိုက်ညီတဲ့ ပစ္စည်း မတွေ့ပါ။',
    saveButton: 'သိမ်းမည်',
    updateButton: 'ပြင်မည်',
    cancelButton: 'ပြင်ခြင်းပိတ်မည်',
    searchPlaceholder: 'ပစ္စည်းနာမည်ရှာရန်',
    loadShop: 'Shop ဖွင့်မည်',
    syncReady: 'Cloud sync အသင့်',
    syncLocal: 'ဖုန်းထဲတွင်ပဲ သိမ်းထားမည်',
    syncError: 'Cloud sync အမှား',
    syncLoading: 'Shop data ဖွင့်နေသည်',
    itemName: 'ပစ္စည်းနာမည်',
    amount: 'အရေအတွက်',
    price: 'ဈေးနှုန်း',
    photo: 'ပုံ',
    language: 'ဘာသာစကား',
    english: 'English',
    burmese: 'မြန်မာ',
    totalItems: 'စုစုပေါင်းပစ္စည်း',
    totalStock: 'စုစုပေါင်းအရေအတွက်',
    inventoryValue: 'စုစုပေါင်းတန်ဖိုး',
    amountUnit: 'ခု',
    priceUnit: 'ကျပ်',
    itemCard: 'ဈေး',
    editItem: 'ပြင်',
    deleteItem: 'ဖျက်',
    exportBackup: 'Backup ထုတ်ရန်',
    importBackup: 'Backup ထည့်ရန်',
    clearAll: 'အားလုံးရှင်းရန်',
    lastSaved: 'ဒီဖုန်းထဲမှာ အလိုအလျောက်သိမ်းပြီး cloud ရှိရင်လည်း sync လုပ်ထားမည်',
    editingLabel: 'ပြင်နေသော ပစ္စည်း',
    savedItem: 'ပစ္စည်းသိမ်းပြီးပါပြီ။',
    updatedItem: 'ပစ္စည်းပြင်ပြီးပါပြီ။',
    deletedItem: 'ပစ္စည်းဖျက်ပြီးပါပြီ။',
    clearedItems: 'Inventory အားလုံးရှင်းပြီးပါပြီ။',
    importedItems: (count: number) => `${count} ခု ပြန်ထည့်ပြီးပါပြီ။`,
    exportReady: 'Backup ဖိုင် ဒေါင်းလုပ်ဆွဲပြီးပါပြီ။',
    importFailed: 'Backup ဖိုင်ကို ဖတ်လို့မရပါ။',
    invalidForm: 'နာမည်, အရေအတွက်, ဈေးနှုန်း ကို မှန်ကန်စွာထည့်ပါ။',
    confirmDelete: 'ဒီပစ္စည်းကို ဖျက်မလား?',
    confirmClear: 'သိမ်းထားတဲ့ ပစ္စည်းအားလုံးကို ရှင်းမလား?',
    cloudSyncFailed: 'Cloud sync မအောင်မြင်ပါ။ ဖုန်းထဲက data ကိုဆက်သိမ်းထားမည်။',
    loadedFromCloud: 'Cloud မှ load လုပ်ပြီးပါပြီ။',
    loadedFromLocal: 'ဖုန်းထဲက local data ကို load လုပ်ပြီးပါပြီ။',
    loadedEmpty: 'ဒီ shop code အတွက် inventory မရှိသေးပါ။',
    shopLoaded: 'Shop ကိုဖွင့်ပြီးပါပြီ။',
    invalidPin: 'PIN ကို ဂဏန်း ၄ မှ ၈ လုံးသာထည့်ပါ။',
    unlocked: 'Shop ကိုဖွင့်ပြီးပါပြီ။',
    locked: 'Shop ကိုပိတ်ပြီးပါပြီ။',
  },
} as const;

const blankForm = {
  name: '',
  amount: '',
  price: '',
  image: '',
};

function formatCurrency(value: number, language: Language) {
  if (language === 'my') {
    return `${value.toLocaleString()} ${copy.my.priceUnit}`;
  }

  return `Ks ${value.toLocaleString()}`;
}

function formatAmount(value: number, language: Language) {
  return `${value.toLocaleString()} ${copy[language].amountUnit}`;
}

function makeItemId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeItem(item: InventoryItem): InventoryItem {
  return {
    id: item.id || makeItemId(),
    name: item.name.trim(),
    amount: Math.max(0, Math.floor(item.amount)),
    price: Math.max(0, Math.round(item.price)),
    image: item.image,
  };
}

function hashPin(pin: string) {
  let hash = 2166136261;

  for (let index = 0; index < pin.length; index += 1) {
    hash ^= pin.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Promise.resolve(hash.toString(16).padStart(8, '0'));
}

function buildScopeKey(shopCode: string, pinHash: string) {
  return normalizeScopeKey(`${normalizeShopCode(shopCode)}-${pinHash.slice(0, 12)}`);
}

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const [shopCodeInput, setShopCodeInput] = useState(DEFAULT_SHOP_CODE);
  const [pinInput, setPinInput] = useState('');
  const [activeShopCode, setActiveShopCode] = useState(DEFAULT_SHOP_CODE);
  const [activeScopeKey, setActiveScopeKey] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [hydrated, setHydrated] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const text = copy[language];

  useEffect(() => {
    const storedCode = window.localStorage.getItem(ACTIVE_SHOP_CODE_KEY);
    const nextCode = storedCode ? normalizeShopCode(storedCode) : DEFAULT_SHOP_CODE;
    setShopCodeInput(nextCode);
    setNotice(text.locked);
  }, [text.locked]);

  useEffect(() => {
    if (!isUnlocked || !hydrated) {
      return;
    }

    window.localStorage.setItem(ACTIVE_SHOP_CODE_KEY, activeShopCode);
    window.localStorage.setItem(getLocalStorageKey(activeScopeKey), serializeInventory(items));

    if (!hasCloudSync()) {
      setSyncState('local');
      return;
    }

    setSyncState('loading');
    replaceInventoryInCloud(activeScopeKey, items)
      .then(() => {
        setSyncState('cloud');
      })
      .catch(() => {
        setSyncState('error');
      });
  }, [activeScopeKey, activeShopCode, hydrated, isUnlocked, items]);

  async function openShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedShopCode = normalizeShopCode(shopCodeInput);
    const pin = pinInput.trim();

    if (!PIN_REGEX.test(pin)) {
      setNotice(text.invalidPin);
      return;
    }

    const pinHash = await hashPin(pin);
    const scopeKey = buildScopeKey(normalizedShopCode, pinHash);
    const localItems = parseInventoryPayload(window.localStorage.getItem(getLocalStorageKey(scopeKey)));

    setHydrated(false);
    setActiveShopCode(normalizedShopCode);
    setActiveScopeKey(scopeKey);
    setIsUnlocked(false);
    setItems([]);
    setQuery('');
    setForm(blankForm);
    setEditingId(null);
    window.localStorage.setItem(ACTIVE_SHOP_CODE_KEY, normalizedShopCode);

    if (!hasCloudSync()) {
      setItems(localItems);
      setSyncState('local');
      setIsUnlocked(true);
      setHydrated(true);
      setNotice(text.unlocked);
      return;
    }

    try {
      const cloudItems = await loadInventoryFromCloud(scopeKey);
      const nextItems = cloudItems.length > 0 ? cloudItems : localItems;

      setItems(nextItems);
      setSyncState('cloud');
      setNotice(cloudItems.length > 0 ? text.loadedFromCloud : text.loadedFromLocal);
      if (cloudItems.length === 0 && localItems.length === 0) {
        setNotice(text.loadedEmpty);
      }
    } catch {
      setItems(localItems);
      setSyncState('error');
      setNotice(text.cloudSyncFailed);
    } finally {
      setIsUnlocked(true);
      setHydrated(true);
    }
  }

  function lockShop() {
    setIsUnlocked(false);
    setActiveScopeKey('');
    setItems([]);
    setQuery('');
    setForm(blankForm);
    setEditingId(null);
    setPinInput('');
    setSyncState('loading');
    setNotice(text.locked);
  }

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(search));
  }, [items, query]);

  const summary = useMemo(() => {
    const totalStock = items.reduce((sum, item) => sum + item.amount, 0);
    const inventoryValue = items.reduce((sum, item) => sum + item.amount * item.price, 0);

    return {
      totalItems: items.length,
      totalStock,
      inventoryValue,
    };
  }, [items]);

  function resetForm() {
    setForm(blankForm);
    setEditingId(null);
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      amount: String(item.amount),
      price: String(item.price),
      image: item.image,
    });
    setNotice(text.editingLabel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const amount = Number(form.amount);
    const price = Number(form.price);

    if (!name || !Number.isFinite(amount) || !Number.isFinite(price) || amount < 0 || price < 0) {
      setNotice(text.invalidForm);
      return;
    }

    const nextItem = normalizeItem({
      id: editingId ?? makeItemId(),
      name,
      amount,
      price,
      image: form.image,
    });

    setItems((current) => {
      if (editingId) {
        return current.map((item) => (item.id === editingId ? nextItem : item));
      }

      return [nextItem, ...current];
    });

    setNotice(editingId ? text.updatedItem : text.savedItem);
    resetForm();
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        image: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleDeleteItem(id: string) {
    if (!window.confirm(text.confirmDelete)) {
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));

    if (editingId === id) {
      resetForm();
    }

    setNotice(text.deletedItem);
  }

  function handleExportBackup() {
    const blob = new Blob([serializeInventory(items)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `shwe-sin-inventory-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(text.exportReady);
  }

  async function handleImportBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const contents = await file.text();
      const restored = parseInventoryPayload(contents);
      const parsed = JSON.parse(contents) as unknown;
      const looksLikeBackup = Array.isArray(parsed) || (
        Boolean(parsed) &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { items?: unknown }).items)
      );

      if (!looksLikeBackup) {
        throw new Error('Invalid backup file');
      }

      setItems(restored);
      resetForm();
      setNotice(text.importedItems(restored.length));
    } catch {
      setNotice(text.importFailed);
    } finally {
      event.target.value = '';
    }
  }

  function handleClearAll() {
    if (!window.confirm(text.confirmClear)) {
      return;
    }

    setItems([]);
    resetForm();
    setNotice(text.clearedItems);
  }

  const syncLabel = syncState === 'cloud'
    ? text.syncReady
    : syncState === 'local'
      ? text.syncLocal
      : syncState === 'error'
        ? text.syncError
        : text.syncLoading;

  const setupCard = (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-6">
      <div className="w-full rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-glow backdrop-blur md:p-7">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            {text.brand}
          </span>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded-xl px-4 py-2 transition ${language === 'en' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
            >
              {text.english}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('my')}
              className={`rounded-xl px-4 py-2 transition ${language === 'my' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
            >
              {text.burmese}
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{text.lockedTitle}</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">{text.lockedHint}</p>
        </div>

        {notice ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {notice}
          </div>
        ) : null}

        <form className="mt-5 grid gap-4" onSubmit={openShop}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>{text.shopCodeLabel}</span>
            <input
              value={shopCodeInput}
              onChange={(event) => setShopCodeInput(event.target.value)}
              placeholder={DEFAULT_SHOP_CODE}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
            />
            <span className="text-xs font-normal text-slate-500">{text.shopCodeHint}</span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>{text.pinLabel}</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              placeholder="0000"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
            />
            <span className="text-xs font-normal text-slate-500">{text.pinHint}</span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            {text.unlockButton}
          </button>
        </form>
      </div>
    </section>
  );

  if (!isUnlocked) {
    return setupCard;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.15),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef6f5_100%)] px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col gap-5">
        <header className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                {text.brand}
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {text.headline}
                </h1>
                <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  {text.subheadline}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-xl px-4 py-2 transition ${language === 'en' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                >
                  {text.english}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('my')}
                  className={`rounded-xl px-4 py-2 transition ${language === 'my' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                >
                  {text.burmese}
                </button>
              </div>

              <button
                type="button"
                onClick={lockShop}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {text.lockButton}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">{text.totalItems}</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">{summary.totalItems}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-700">{text.totalStock}</p>
              <p className="mt-1 text-2xl font-semibold text-sky-950">{formatAmount(summary.totalStock, language)}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-700">{text.inventoryValue}</p>
              <p className="mt-1 text-2xl font-semibold text-amber-950">{formatCurrency(summary.inventoryValue, language)}</p>
            </div>
          </div>

          {notice ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {notice}
            </div>
          ) : null}
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-glow backdrop-blur md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{text.addTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{text.addHint}</p>
              </div>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>{text.photo}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </label>

              {form.image ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image} alt={form.name || text.photo} className="h-44 w-full object-cover" />
                </div>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>{text.itemName}</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={text.itemName}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>{text.amount}</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="0"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>{text.price}</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                    placeholder="0"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  {editingId ? text.updateButton : text.saveButton}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {text.cancelButton}
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-slate-950 p-5 text-white shadow-glow md:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{text.searchTitle}</h2>
                <p className="mt-1 text-sm text-slate-300">{text.searchHint}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {syncLabel}
              </span>
            </div>

            <label className="block">
              <span className="sr-only">{text.searchPlaceholder}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.searchPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white/15"
              />
            </label>

            <div className="mt-5 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                  {items.length === 0 ? text.emptyState : text.noMatch}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <article key={item.id} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="h-18 w-18 shrink-0 overflow-hidden rounded-2xl bg-white/10">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          {text.photo}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="truncate text-base font-semibold text-white">{item.name}</h3>
                          <p className="mt-1 text-sm text-slate-300">{formatAmount(item.amount, language)}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-400/15 px-3 py-2 text-right">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200">{text.itemCard}</p>
                          <p className="text-lg font-semibold text-emerald-50">{formatCurrency(item.price, language)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          {text.editItem}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded-full border border-rose-300/30 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10"
                        >
                          {text.deleteItem}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-glow backdrop-blur md:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{text.maintenanceTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{text.maintenanceHint}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">
              {text.lastSaved}
            </p>

            <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={openShop}>
              <div className="grid gap-3">
                <div className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>{text.shopCodeLabel}</span>
                  <input
                    value={shopCodeInput}
                    onChange={(event) => setShopCodeInput(event.target.value)}
                    placeholder={DEFAULT_SHOP_CODE}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                  />
                  <span className="text-xs font-normal text-slate-500">{text.shopCodeHint}</span>
                </div>
                <div className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>{text.pinLabel}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={pinInput}
                    onChange={(event) => setPinInput(event.target.value)}
                    placeholder="0000"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                  />
                  <span className="text-xs font-normal text-slate-500">{text.pinHint}</span>
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                {text.loadShop}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                {text.currentShop}: {activeShopCode}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                {syncLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              {text.exportBackup}
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {text.importBackup}
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              {text.clearAll}
            </button>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportBackup}
            className="hidden"
          />
        </section>
      </div>
    </main>
  );
}
