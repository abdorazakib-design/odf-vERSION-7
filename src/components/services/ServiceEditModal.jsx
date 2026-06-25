import React from "react";
import { Modal, Btn, Field } from "../common/UI.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE EDIT MODAL — modal d'édition d'un service
// ═══════════════════════════════════════════════════════════════════════════

export function ServiceEditModal({
  editingService,
  editLabel, setEditLabel,
  editClient, setEditClient,
  editFourn, setEditFourn,
  editStatut, setEditStatut,
  clients, fournisseurs,
  onClose, onSave, TH
}) {
  if (!editingService) return null;

  return (
    <Modal title={`Modifier le service — ${editingService.cid || editingService.id}`} onClose={onClose} TH={TH}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Field label="Label du service *" TH={TH}>
          <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
            style={{ width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: "8px", padding: "9px 12px", color: TH.text1, fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
        </Field>

        <Field label="Client *" TH={TH}>
          <select value={editClient} onChange={e => setEditClient(e.target.value)}
            style={{ width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: "8px", padding: "9px 12px", color: TH.text1, fontSize: "13px", outline: "none", boxSizing: "border-box" }}>
            <option value="">— Sélectionner un client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </Field>

        <Field label="Fournisseur *" TH={TH}>
          <select value={editFourn} onChange={e => setEditFourn(e.target.value)}
            style={{ width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: "8px", padding: "9px 12px", color: TH.text1, fontSize: "13px", outline: "none", boxSizing: "border-box" }}>
            <option value="">— Sélectionner un fournisseur —</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </Field>

        <Field label="Statut *" TH={TH}>
          <select value={editStatut} onChange={e => setEditStatut(e.target.value)}
            style={{ width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: "8px", padding: "9px 12px", color: TH.text1, fontSize: "13px", outline: "none", boxSizing: "border-box" }}>
            <option value="ACTIF">ACTIF</option>
            <option value="SUSPENDU">SUSPENDU</option>
            <option value="RESILIE">RESILIE</option>
          </select>
        </Field>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
          <Btn onClick={onClose} variant="ghost" TH={TH}>Annuler</Btn>
          <Btn onClick={onSave} TH={TH}>Enregistrer</Btn>
        </div>
      </div>
    </Modal>
  );
}
