import { createClient } from '@supabase/supabase-js';

export type InventoryItem = {
  id: string;
  name: string;
  amount: number;
  price: number;
  image: string;
};

type InventoryRow = InventoryItem & {
  shop_code: string;
  sort_order: number;
};

const TABLE_NAME = 'inventory_items';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function hasCloudSync() {
  return Boolean(supabase);
}

export function isValidShopCode(value: string) {
  return /^[a-zA-Z0-9_-]{3,40}$/.test(value);
}

export function normalizeShopCode(value: string) {
  const sanitized = value.trim().toLowerCase().replace(/\s+/g, '-');
  return isValidShopCode(sanitized) ? sanitized : 'main-shop';
}

export function normalizeScopeKey(value: string) {
  const sanitized = value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '-');

  if (sanitized.length < 3) {
    return 'main-shop';
  }

  return sanitized.slice(0, 80);
}

export function getLocalStorageKey(scopeKey: string) {
  return `shwe-sin-items:${normalizeScopeKey(scopeKey)}`;
}

function normalizeItem(item: InventoryItem): InventoryItem {
  return {
    id: item.id,
    name: item.name.trim(),
    amount: Math.max(0, Math.floor(item.amount)),
    price: Math.max(0, Math.round(item.price)),
    image: item.image,
  };
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.amount === 'number' &&
    Number.isFinite(candidate.amount) &&
    typeof candidate.price === 'number' &&
    Number.isFinite(candidate.price) &&
    typeof candidate.image === 'string'
  );
}

export function parseInventoryPayload(raw: string | null): InventoryItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(isInventoryItem).map(normalizeItem);
    }

    if (parsed && typeof parsed === 'object') {
      const payload = parsed as { items?: unknown };
      if (Array.isArray(payload.items)) {
        return payload.items.filter(isInventoryItem).map(normalizeItem);
      }
    }
  } catch {
    return [];
  }

  return [];
}

export function serializeInventory(items: InventoryItem[]) {
  return JSON.stringify(
    {
      version: 1,
      items: items.map(normalizeItem),
    },
    null,
    2,
  );
}

export function prepareInventoryForStorage(items: InventoryItem[]) {
  return items.map(normalizeItem);
}

export async function loadInventoryFromCloud(shopCode: string) {
  if (!supabase) {
    return [] as InventoryItem[];
  }

  const normalizedShopCode = normalizeScopeKey(shopCode);
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,name,amount,price,image,shop_code,sort_order')
    .eq('shop_code', normalizedShopCode)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter(isInventoryItem)
    .map(({ id, name, amount, price, image }) => ({
      id,
      name,
      amount,
      price,
      image,
    }));
}

export async function replaceInventoryInCloud(shopCode: string, items: InventoryItem[]) {
  if (!supabase) {
    return;
  }

  const normalizedShopCode = normalizeScopeKey(shopCode);
  const rows: InventoryRow[] = items.map((item, index) => ({
    ...normalizeItem(item),
    shop_code: normalizedShopCode,
    sort_order: index,
  }));

  const deleteResult = await supabase.from(TABLE_NAME).delete().eq('shop_code', normalizedShopCode);
  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(TABLE_NAME).upsert(rows, {
    onConflict: 'shop_code,id',
  });

  if (error) {
    throw error;
  }
}
