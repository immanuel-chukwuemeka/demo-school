/* ==============================================================
 * FIRESTORE HELPERS — thin wrappers over the firebase/firestore SDK
 * ============================================================== */
import { db } from "./firebase.js";
import {
  doc, setDoc, getDoc, getDocs, query, collection,
  addDoc, updateDoc, deleteDoc, where, orderBy, limit, onSnapshot, deleteField
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export {
  doc, setDoc, getDoc, getDocs, query, collection,
  addDoc, updateDoc, deleteDoc, where, orderBy, limit, onSnapshot, deleteField
};

/** Snapshot a single document into plain data (or null). */
export async function getData(path, ...ids) {
  const ref = ids.length ? doc(db, path, ...ids) : doc(db, path);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Cache-bypassing snapshot of a single document used for settings. */
export async function snapData(ref) {
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Snapshot a query into an array of plain objects. */
export async function queryData(q) {
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** All documents in a collection (small collections only). */
export function colRef(name) { return collection(db, name); }

export function qWhere(name, field, op, value) {
  return query(collection(db, name), where(field, op, value));
}