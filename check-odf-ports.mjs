import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function check() {
  const odfId1 = 'ALP-S1-R1-ODF1';
  const odfId2 = 'ALP-S1-R1-ODF2';

  console.log(`--- Checking ODFs ---`);
  const { data: odfs, error: odfErr } = await supabase.from('odfs').select('*').in('id', [odfId1, odfId2]);
  if (odfErr) {
    console.error('ODF Error:', odfErr);
  } else {
    console.log('ODFs:', odfs);
  }

  console.log(`\n--- Checking Slots for ODF1 and ODF2 ---`);
  const { data: slots, error: slotsErr } = await supabase.from('slots').select('*').in('odf_id', [odfId1, odfId2]);
  if (slotsErr) {
    console.error('Slots Error:', slotsErr);
  } else {
    console.log('Slots count:', slots?.length);
    console.log('Slots:', slots);
  }

  console.log(`\n--- Checking Non-LIBRE Ports for ODF1 and ODF2 ---`);
  const { data: ports, error: portsErr } = await supabase.from('ports').select('id, slot_id, odf_id, statut').in('odf_id', [odfId1, odfId2]).neq('statut', 'LIBRE');
  if (portsErr) {
    console.error('Ports Error:', portsErr);
  } else {
    console.log('Non-LIBRE ports count:', ports?.length);
    console.log('Non-LIBRE ports:', ports);
  }

  console.log(`\n--- Checking Cables connected to ODF1 or ODF2 ---`);
  const { data: cables, error: cablesErr } = await supabase.from('cables_fibre').select('*');
  if (cablesErr) {
    console.error('Cables Error:', cablesErr);
  } else {
    const filteredCables = (cables || []).filter(c => {
      return (c.port_source_id && (c.port_source_id.includes(odfId1) || c.port_source_id.includes(odfId2))) ||
             (c.port_dest_id && (c.port_dest_id.includes(odfId1) || c.port_dest_id.includes(odfId2)));
    });
    console.log('Connected cables count:', filteredCables.length);
    console.log('Connected cables:', filteredCables);
  }
}

check();
