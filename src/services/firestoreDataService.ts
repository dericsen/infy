import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Ingredient, SaleRecord, WasteRecord } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import {
  BENCHMARK_MENU_ITEMS,
  BENCHMARK_INGREDIENTS,
  INITIAL_BENCHMARK_SALES
} from '../data/benchmarkData';

export async function fetchMenuItems(restaurantId: string): Promise<MenuItem[]> {
  try {
    const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'menu_items'));
    if (snap.empty) {
      return BENCHMARK_MENU_ITEMS;
    }
    return snap.docs.map(d => d.data() as MenuItem);
  } catch (err) {
    console.warn('Falling back to local menu state:', err);
    return BENCHMARK_MENU_ITEMS;
  }
}

export async function persistMenuItem(restaurantId: string, item: MenuItem): Promise<void> {
  const docPath = `restaurants/${restaurantId}/menu_items/${item.id}`;
  try {
    await setDoc(doc(db, 'restaurants', restaurantId, 'menu_items', item.id), {
      ...item,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function removeMenuItem(restaurantId: string, itemId: string): Promise<void> {
  const docPath = `restaurants/${restaurantId}/menu_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu_items', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function fetchIngredients(restaurantId: string): Promise<Ingredient[]> {
  try {
    const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'ingredients'));
    if (snap.empty) {
      return BENCHMARK_INGREDIENTS;
    }
    return snap.docs.map(d => d.data() as Ingredient);
  } catch (err) {
    console.warn('Falling back to local ingredients state:', err);
    return BENCHMARK_INGREDIENTS;
  }
}

export async function persistIngredient(restaurantId: string, ingredient: Ingredient): Promise<void> {
  const docPath = `restaurants/${restaurantId}/ingredients/${ingredient.id}`;
  try {
    await setDoc(doc(db, 'restaurants', restaurantId, 'ingredients', ingredient.id), {
      ...ingredient,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function persistIngredientStock(
  restaurantId: string,
  ingredientId: string,
  newStock: number
): Promise<void> {
  const docPath = `restaurants/${restaurantId}/ingredients/${ingredientId}`;
  try {
    const ref = doc(db, 'restaurants', restaurantId, 'ingredients', ingredientId);
    await setDoc(ref, { currentStock: newStock, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }
}

export async function removeIngredient(restaurantId: string, ingredientId: string): Promise<void> {
  const docPath = `restaurants/${restaurantId}/ingredients/${ingredientId}`;
  try {
    await deleteDoc(doc(db, 'restaurants', restaurantId, 'ingredients', ingredientId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

export async function fetchSalesRecords(restaurantId: string): Promise<SaleRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'daily_sales'));
    if (snap.empty) {
      return INITIAL_BENCHMARK_SALES;
    }
    return snap.docs.map(d => d.data() as SaleRecord);
  } catch (err) {
    console.warn('Falling back to local sales state:', err);
    return INITIAL_BENCHMARK_SALES;
  }
}

export async function persistSaleRecord(restaurantId: string, record: SaleRecord): Promise<void> {
  const docPath = `restaurants/${restaurantId}/daily_sales/${record.id}`;
  try {
    await setDoc(doc(db, 'restaurants', restaurantId, 'daily_sales', record.id), record);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function recordSaleAndDeductInventory(
  restaurantId: string,
  sale: SaleRecord,
  menuItems: MenuItem[],
  ingredients: Ingredient[]
): Promise<{ updatedIngredients: Ingredient[]; consumedDetails: { ingredientName: string; amount: number; unit: string }[] }> {
  await persistSaleRecord(restaurantId, sale);

  const matchedDish = menuItems.find(m => m.id === sale.menuItemId);
  if (!matchedDish || !matchedDish.ingredients || matchedDish.ingredients.length === 0) {
    return { updatedIngredients: ingredients, consumedDetails: [] };
  }

  const consumedDetails: { ingredientName: string; amount: number; unit: string }[] = [];
  const updatedIngredients = ingredients.map(ing => {
    const bomItem = matchedDish.ingredients.find(b => b.ingredientId === ing.id);
    if (!bomItem) return ing;

    const totalConsumed = Math.round(bomItem.quantity * sale.quantitySold * 100) / 100;
    const newStock = Math.max(0, Math.round((ing.currentStock - totalConsumed) * 100) / 100);

    consumedDetails.push({
      ingredientName: ing.name,
      amount: totalConsumed,
      unit: ing.unit
    });

    persistIngredientStock(restaurantId, ing.id, newStock);
    return { ...ing, currentStock: newStock };
  });

  return { updatedIngredients, consumedDetails };
}

export async function fetchWasteRecords(restaurantId: string): Promise<WasteRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'waste_records'));
    if (snap.empty) {
      return [];
    }
    return snap.docs.map(d => d.data() as WasteRecord);
  } catch (err) {
    console.warn('Falling back to local waste state:', err);
    return [];
  }
}

export async function persistWasteRecord(restaurantId: string, record: WasteRecord): Promise<void> {
  const docPath = `restaurants/${restaurantId}/waste_records/${record.id}`;
  try {
    await setDoc(doc(db, 'restaurants', restaurantId, 'waste_records', record.id), record);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function seedRestaurantToFirestore(restaurantId: string): Promise<void> {
  try {
    const rstDoc = doc(db, 'restaurants', restaurantId);
    await setDoc(rstDoc, {
      id: restaurantId,
      name: 'The Rustic Table',
      concept: 'Bistro & Seasonal Kitchen',
      currency: '$',
      stations: ['Grill', 'Saute', 'Garde Manger', 'Bakery'],
      isDemonstrationData: true,
      createdAt: new Date().toISOString()
    }, { merge: true });

    for (const item of BENCHMARK_MENU_ITEMS) {
      await setDoc(doc(db, 'restaurants', restaurantId, 'menu_items', item.id), item, { merge: true });
    }

    for (const ing of BENCHMARK_INGREDIENTS) {
      await setDoc(doc(db, 'restaurants', restaurantId, 'ingredients', ing.id), ing, { merge: true });
    }

    const sampleSales = INITIAL_BENCHMARK_SALES.slice(0, 36);
    for (const sale of sampleSales) {
      await setDoc(doc(db, 'restaurants', restaurantId, 'daily_sales', sale.id), sale, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore seeding skipped or running in offline mode:', err);
  }
}
