import React, { useState, useEffect, useMemo } from "react";
import { supabase, getTransitData } from "../../supabase.js";
import { Modal } from "../common/UI.jsx";
import { useRouteGraph, findBestInternalPort, genCid } from "./routingEngine.js";

// Import Wizard Steps
import { SelectSitesStep } from "./wizard/SelectSitesStep.jsx";
import { HopStep } from "./wizard/HopStep.jsx";
import { SelectFournisseurStep } from "./wizard/SelectFournisseurStep.jsx";
import { SelectClientStep } from "./wizard/SelectClientStep.jsx";
import { ConfirmStep } from "./wizard/ConfirmStep.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WIZARD
// ═══════════════════════════════════════════════════════════════════════════

export function ServiceWizard({ open, onClose, onDone, sites, cables, fournisseurs, clients, userLabel, TH, t }) {
  const [step, setStep] = useState("SELECT_SITES");
  const [currentHopIdx, setCurrentHopIdx] = useState(0);

  const [label, setLabel] = useState("");
  const [siteA, setSiteA] = useState("");
  const [siteB, setSiteB] = useState("");
  const [pathSites, setPathSites] = useState([]);
  const [noPath, setNoPath] = useState(false);
  const [hops, setHops] = useState([]);

  const [fournisseurId, setFournisseurId] = useState("");
  const [clientId, setClientId] = useState("");
  const [capacite, setCapacite] = useState("10");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [transitPorts, setTransitPorts] = useState([]);
  const [transitData, setTransitData] = useState(null);
  const [transitReco, setTransitReco] = useState([]);
  const [transitLoading, setTransitLoading] = useState(false);
  const [hopPorts, setHopPorts] = useState([]);
  const [loadingHopPorts, setLoadingHopPorts] = useState(false);

  const { findPath, getCablesBetween } = useRouteGraph(cables);

  useEffect(() => {
    if (open) {
      setStep("SELECT_SITES");
      setCurrentHopIdx(0);
      setLabel("");
      setSiteA("");
      setSiteB("");
      setPathSites([]);
      setNoPath(false);
      setHops([]);
      setFournisseurId("");
      setClientId("");
      setCapacite("10");
      setSaving(false);
      setErr("");
      setTransitData(null);
      setTransitReco([]);
      setTransitLoading(false);
      setHopPorts([]);
      setLoadingHopPorts(false);
    }
  }, [open]);

  useEffect(() => {
    if (!siteA || !siteB || siteA === siteB) {
      setPathSites([]);
      setNoPath(false);
      return;
    }
    const path = findPath(siteA, siteB);
    if (path) {
      setPathSites(path);
      setNoPath(false);
      setHops(Array(path.length - 1).fill(null).map(() => ({
        cableId: null, portEntree: null, portSortie: null,
        siteFrom: null, siteTo: null, cable_reference: null
      })));
    } else {
      setPathSites([]);
      setNoPath(true);
    }
  }, [siteA, siteB, cables, findPath]);

  useEffect(() => {
    if (!step.startsWith("HOP_")) {
      setTransitPorts([]); setTransitData(null); setTransitReco([]); setTransitLoading(false);
      return;
    }
    const n = parseInt(step.split("_")[1], 10);
    if (n === 0 || !pathSites[n]) {
      setTransitPorts([]); setTransitData(null); setTransitReco([]); setTransitLoading(false);
      return;
    }
    setTransitLoading(true);
    setTransitData(null);
    setTransitPorts([]);
    setTransitReco([]);
    const siteBTransit = pathSites[n];
    getTransitData(siteBTransit).then(data => {
      setTransitData(data);
      setTransitPorts(data.internalPorts);
      setTransitLoading(false);
    });
  }, [step, pathSites]);

  useEffect(() => {
    if (!transitData || !step.startsWith("HOP_")) return;
    const n = parseInt(step.split("_")[1], 10);
    if (n === 0) return;
    const portTransitIn = hops[n - 1]?.portSortie || null;
    if (!portTransitIn) { setTransitReco([]); return; }
    const portEntreeB = hops[n]?.portEntree || null;
    const siteBTransit = pathSites[n];
    const siteCNext = pathSites[n + 1];
    const cablesExterneB = (cables || []).filter(c => {
      const s = c.port_source_id?.split('-')[0];
      const d = c.port_dest_id?.split('-')[0];
      return (s === siteBTransit && d === siteCNext) || (s === siteCNext && d === siteBTransit);
    });
    const reco = findBestInternalPort({
      portTransitIn, portEntreeB,
      internalPorts: transitData.internalPorts,
      externalPorts: transitData.externalPorts,
      jarretieres: transitData.jarretieres,
      cablesExterneB,
    });
    setTransitReco(reco);
    if (reco.length > 0 && ['PERFECT_MATCH', 'CHAIN_CONFIRMED'].includes(reco[0].matchType) && !hops[n]?.portTransitMid) {
      onSelectTransitMid(n, reco[0].portInterne.id);
    }
  }, [hops, transitData, step, pathSites, cables]);

  const totalHops = pathSites.length > 1 ? pathSites.length - 1 : 0;
  const siteName = (id) => (sites || []).find(s => s.id === id)?.name || id;

  const onSubmitSites = () => {
    setErr("");
    if (!label.trim()) { setErr("Le label du service est obligatoire."); return; }
    if (!siteA || !siteB) { setErr("Veuillez sélectionner les sites de départ et d'arrivée."); return; }
    if (siteA === siteB) { setErr("Les sites de départ et d'arrivée doivent être différents."); return; }
    if (pathSites.length === 0) { setErr("Aucun chemin disponible entre ces deux sites."); return; }
    setStep("HOP_0");
    setCurrentHopIdx(0);
  };

  const onSelectCable = (hopIdx, cable) => {
    setErr("");
    const newHops = [...hops];
    newHops[hopIdx] = {
      ...newHops[hopIdx],
      cableId: cable.id,
      portEntree: cable.portEntree,
      portSortie: cable.portSortie,
      siteFrom: cable.siteSource === pathSites[hopIdx] ? cable.siteSource : cable.siteDest,
      siteTo: cable.siteSource === pathSites[hopIdx] ? cable.siteDest : cable.siteSource,
      cable_reference: cable.cable_reference,
    };
    setHops(newHops);
  };

  const onSelectTransitMid = (hopIdx, portId) => {
    const newHops = [...hops];
    newHops[hopIdx] = {
      ...newHops[hopIdx],
      portTransitMid: portId
    };
    setHops(newHops);
  };

  useEffect(() => {
    if (!step.startsWith("HOP_")) {
      setHopPorts([]);
      return;
    }
    const n = parseInt(step.split("_")[1], 10);
    const fromSite = pathSites[n];
    const toSite = pathSites[n + 1];
    if (!fromSite || !toSite) {
      setHopPorts([]);
      return;
    }

    const cablesDispos = getCablesBetween(fromSite, toSite);
    const slotIds = new Set();
    cablesDispos.forEach(c => {
      if (c.portEntreeObj?.slot_id) slotIds.add(c.portEntreeObj.slot_id);
      if (c.portSortieObj?.slot_id) slotIds.add(c.portSortieObj.slot_id);
    });

    if (slotIds.size === 0) {
      setHopPorts([]);
      return;
    }

    setLoadingHopPorts(true);
    supabase.from("ports")
      .select("id, slot_id, slot_port, statut")
      .in("slot_id", Array.from(slotIds))
      .then(r => {
        setHopPorts(r.data || []);
        setLoadingHopPorts(false);
      })
      .catch(err => {
        console.error("Error fetching hop ports:", err);
        setLoadingHopPorts(false);
      });
  }, [step, pathSites, cables]);

  // Compute active hop index from step
  const activeHopIdx = useMemo(() => {
    if (!step.startsWith("HOP_")) return null;
    return parseInt(step.split("_")[1], 10);
  }, [step]);

  // Compute cablesDispos for active hop
  const activeCablesDispos = useMemo(() => {
    if (activeHopIdx === null) return [];
    const fromSite = pathSites[activeHopIdx];
    const toSite = pathSites[activeHopIdx + 1];
    if (!fromSite || !toSite) return [];
    return getCablesBetween(fromSite, toSite);
  }, [activeHopIdx, pathSites, getCablesBetween]);

  // Compute availablePortOptions for active hop
  const availablePortOptions = useMemo(() => {
    if (activeHopIdx === null || activeCablesDispos.length === 0) return [];
    
    const getPortNumber = (portStr) => {
      if (!portStr) return 0;
      const m = portStr.match(/P(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    };

    const portMap = {};
    (hopPorts || []).forEach(p => {
      portMap[p.id] = p;
    });

    const list = [];
    activeCablesDispos.forEach(c => {
      const srcSlotId = c.portEntreeObj?.slot_id;
      const dstSlotId = c.portSortieObj?.slot_id;
      if (!srcSlotId || !dstSlotId) return;

      for (let pNum = 1; pNum <= 12; pNum++) {
        const pStr = String(pNum).padStart(2, '0');
        const pIdSrc = `${srcSlotId}P${pStr}`;
        const pIdDst = `${dstSlotId}P${pStr}`;

        const portSrc = portMap[pIdSrc];
        const portDst = portMap[pIdDst];

        if (portSrc && portDst && portSrc.statut === "LIBRE" && portDst.statut === "LIBRE") {
          list.push({
            cable: c,
            portEntree: pIdSrc,
            portSortie: pIdDst,
            cable_reference: c.cable_reference,
          });
        }
      }
    });

    list.sort((a, b) => {
      const portNumA = getPortNumber(a.portEntree);
      const portNumB = getPortNumber(b.portEntree);
      if (portNumA !== portNumB) return portNumA - portNumB;
      return a.cable_reference.localeCompare(b.cable_reference);
    });

    return list;
  }, [activeHopIdx, activeCablesDispos, hopPorts]);

  // Auto-select first available port if none is selected
  useEffect(() => {
    if (open && activeHopIdx !== null && availablePortOptions.length > 0 && !loadingHopPorts) {
      const currentPort = hops[activeHopIdx]?.portEntree;
      if (!currentPort) {
        const firstOpt = availablePortOptions[0];
        const modifiedCable = {
          ...firstOpt.cable,
          portEntree: firstOpt.portEntree,
          portSortie: firstOpt.portSortie,
        };
        onSelectCable(activeHopIdx, modifiedCable);
      }
    }
  }, [open, activeHopIdx, availablePortOptions, loadingHopPorts, hops]);

  if (!open) return null;

  const onNextHop = (hopIdx) => {
    setErr("");
    if (!hops[hopIdx] || !hops[hopIdx].cableId) {
      const from = siteName(pathSites[hopIdx]);
      const to = siteName(pathSites[hopIdx + 1]);
      setErr(`Veuillez sélectionner un câble pour la liaison ${from} → ${to}.`);
      return;
    }
    if (hopIdx > 0) {
      const portTransitInCheck = hops[hopIdx - 1]?.portSortie || null;
      if (!portTransitInCheck) {
        setErr(`Erreur : le port d'arrivée depuis ${siteName(pathSites[hopIdx - 1])} → ${siteName(pathSites[hopIdx])} n'est pas résolu. Retournez à l'étape précédente et sélectionnez un câble valide.`);
        return;
      }
      if (!hops[hopIdx].portEntree) {
        setErr(`Veuillez sélectionner le port de sortie vers ${siteName(pathSites[hopIdx + 1])} (étape 2).`);
        return;
      }
      if (!hops[hopIdx].portTransitMid) {
        setErr(`Veuillez sélectionner un port de brassage interne iODF sur le site ${siteName(pathSites[hopIdx])} (étape 3 — connexion locale requise).`);
        return;
      }
    }
    if (hopIdx + 1 < totalHops) {
      setStep(`HOP_${hopIdx + 1}`);
      setCurrentHopIdx(hopIdx + 1);
    } else {
      setStep("SELECT_FOURNISSEUR");
    }
  };

  const onNextFournisseur = () => {
    setErr("");
    if (!fournisseurId) { setErr("Veuillez sélectionner un fournisseur d'accès."); return; }
    setStep("SELECT_CLIENT");
  };

  const onNextClient = () => {
    setErr("");
    if (!clientId) { setErr("Veuillez sélectionner un client final."); return; }
    setStep("CONFIRM");
  };

  // Décrit une jarretière de transit (cordon de brassage interne) à créer.
  // La création réelle du câble est déléguée au RPC atomique pour rester
  // dans la même transaction que le service (évite les câbles/ports orphelins).
  const buildTransitJar = (siteTransit, p1, p2, typeLien = 'JARRETIERE') => {
    // Sécurité : ne jamais créer une jarretière où source = destination
    if (!p1 || !p2 || p1 === p2) return null;

    const jarRef = `JAR-${siteTransit}-${p1.split('_').pop()}-${p2.split('_').pop()}`;
    const nom = `Câble interne ${siteTransit} : ${p1.split('_').pop()} ↔ ${p2.split('_').pop()}`;

    return {
      cable_id: null,
      jar_ref: jarRef,
      jar_nom: nom,
      jar_type: typeLien,
      port_entree_id: p1,
      port_sortie_id: p2,
    };
  };

  const onConfirm = async () => {
    setSaving(true); setErr("");

    try {
      for (let i = 1; i < hops.length; i++) {
        const portTransitIn = hops[i - 1]?.portSortie || null;
        if (!portTransitIn) {
          const siteFrom = siteName(pathSites[i - 1]);
          const siteTo = siteName(pathSites[i]);
          throw new Error(`Le port d'arrivée sur le site de transit ${siteTo} (depuis ${siteFrom}) n'est pas résolu. Retournez à l'étape ${i} et vérifiez le câble sélectionné.`);
        }
        if (!hops[i]?.portTransitMid) {
          throw new Error(`La connexion locale iODF sur le site de transit ${siteName(pathSites[i])} est manquante (étape ${i + 1}). Sélectionnez un port de brassage interne.`);
        }
      }

      const cid = genCid();
      const primaryHop = hops[0];

      const jonctions = [];
      let ordre = 1;

      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        if (!hop || !hop.cableId) continue;

        if (i > 0) {
          const portTransitIn = hops[i - 1]?.portSortie;
          const portTransitMid = hop.portTransitMid;
          const siteTransit = hop.siteFrom || pathSites[i];

          if (portTransitIn && portTransitMid && hop.portEntree) {
            // Jarretière 1 : port d'arrivée → port de brassage interne
            if (portTransitIn !== portTransitMid) {
              const jar1 = buildTransitJar(siteTransit, portTransitIn, portTransitMid);
              if (jar1) jonctions.push({ ordre: ordre++, ...jar1 });
            }

            // Jarretière 2 : port de brassage interne → port de départ vers site suivant
            if (portTransitMid !== hop.portEntree) {
              const jar2 = buildTransitJar(siteTransit, portTransitMid, hop.portEntree);
              if (jar2) jonctions.push({ ordre: ordre++, ...jar2 });
            }
          } else if (portTransitIn && !portTransitMid && portTransitIn !== hop.portEntree && hop.portEntree) {
            const jarF = buildTransitJar(siteTransit, portTransitIn, hop.portEntree);
            if (jarF) jonctions.push({ ordre: ordre++, ...jarF });
          }
        }

        jonctions.push({
          ordre: ordre++,
          cable_id: hop.cableId,
          port_entree_id: hop.portEntree,
          port_sortie_id: hop.portSortie,
        });
      }

      // Appel de l'insertion et propagation atomique en base de données via RPC.
      // p_service_id est laissé à null : le RPC dérive l'id du CID dédupliqué
      // afin d'éviter toute collision de clé primaire (CID à la seconde près).
      const { error: rpcErr } = await supabase.rpc(
        "create_service_with_jonctions_atomic",
        {
          p_service_id: null,
          p_cid: cid,
          p_label: label.trim(),
          p_cable_id: primaryHop.cableId,
          p_client_id: clientId || null,
          p_fournisseur_id: fournisseurId || null,
          p_port_id: primaryHop.portEntree,
          p_jonctions: jonctions,
          p_history_action: `Service créé via wizard : ${cid} — ${label.trim()} (${siteA}→${siteB})`,
          p_created_by: userLabel || null,
          p_capacite_gbps: Number(capacite) || 0
        }
      );

      if (rpcErr) throw rpcErr;

      setSaving(false);
      onDone();

    } catch (e) {
      setErr(e.message || "Erreur lors de la création du service. Veuillez réessayer.");
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "SELECT_SITES":
        return (
          <SelectSitesStep
            label={label}
            setLabel={setLabel}
            siteA={siteA}
            setSiteA={setSiteA}
            siteB={siteB}
            setSiteB={setSiteB}
            sites={sites}
            pathSites={pathSites}
            noPath={noPath}
            TH={TH}
            onClose={onClose}
            onSubmitSites={onSubmitSites}
            siteName={siteName}
            setErr={setErr}
          />
        );
      case "SELECT_FOURNISSEUR":
        return (
          <SelectFournisseurStep
            pathSites={pathSites}
            sites={sites}
            fournisseurId={fournisseurId}
            setFournisseurId={setFournisseurId}
            fournisseurs={fournisseurs}
            cables={cables}
            hops={hops}
            totalHops={totalHops}
            TH={TH}
            siteA={siteA}
            setStep={setStep}
            setCurrentHopIdx={setCurrentHopIdx}
            setErr={setErr}
            onNextFournisseur={onNextFournisseur}
            siteName={siteName}
          />
        );
      case "SELECT_CLIENT":
        return (
          <SelectClientStep
            pathSites={pathSites}
            sites={sites}
            clientId={clientId}
            setClientId={setClientId}
            clients={clients}
            capacite={capacite}
            setCapacite={setCapacite}
            totalHops={totalHops}
            TH={TH}
            siteB={siteB}
            setStep={setStep}
            setErr={setErr}
            onNextClient={onNextClient}
            siteName={siteName}
          />
        );
      case "CONFIRM":
        return (
          <ConfirmStep
            pathSites={pathSites}
            sites={sites}
            hops={hops}
            totalHops={totalHops}
            fournisseurId={fournisseurId}
            fournisseurs={fournisseurs}
            clientId={clientId}
            clients={clients}
            capacite={capacite}
            label={label}
            saving={saving}
            TH={TH}
            setStep={setStep}
            setErr={setErr}
            onConfirm={onConfirm}
            siteName={siteName}
          />
        );
      default:
        if (step.startsWith("HOP_")) {
          return (
            <HopStep
              n={activeHopIdx}
              pathSites={pathSites}
              sites={sites}
              hops={hops}
              loadingHopPorts={loadingHopPorts}
              availablePortOptions={availablePortOptions}
              transitReco={transitReco}
              transitPorts={transitPorts}
              transitLoading={transitLoading}
              totalHops={totalHops}
              TH={TH}
              setStep={setStep}
              setCurrentHopIdx={setCurrentHopIdx}
              setErr={setErr}
              onSelectCable={onSelectCable}
              onSelectTransitMid={onSelectTransitMid}
              onNextHop={onNextHop}
              siteName={siteName}
            />
          );
        }
        return null;
    }
  };

  const stepTitle = () => {
    if (step === "SELECT_SITES") return "Nouveau service — Définir la route";
    if (step.startsWith("HOP_")) {
      const n = parseInt(step.split("_")[1], 10);
      return `Étape ${n + 1}/${totalHops} — Sélection câble ${siteName(pathSites[n])} › ${siteName(pathSites[n + 1])}`;
    }
    if (step === "SELECT_FOURNISSEUR") return "Sélection du fournisseur";
    if (step === "SELECT_CLIENT") return "Sélection du client final";
    if (step === "CONFIRM") return "Confirmation avant création";
    return "Nouveau service";
  };

  return (
    <Modal title={stepTitle()} onClose={saving ? undefined : onClose} TH={TH} width="720px">
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {renderStep()}
        {err && (
          <div style={{
            background: `${TH.red}22`, border: `1px solid ${TH.red}`,
            borderRadius: "8px", padding: "8px 12px",
            color: TH.red, fontSize: "12px", marginTop: "4px"
          }}>
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}
