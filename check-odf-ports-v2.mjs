import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

const headers = {
  'apikey': key,
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json'
};

async function check() {
  const odfId1 = 'ALP-S1-R1-ODF1';
  const odfId2 = 'ALP-S1-R1-ODF2';

  console.log(`--- Checking ODFs ---`);
  const odfsRes = await fetch(`${url}/rest/v1/odfs?id=in.("${odfId1}","${odfId2}")`, { headers });
  const odfs = await odfsRes.json();
  console.log('ODFs:', odfs);

  console.log(`\n--- Checking Slots for ODF1 and ODF2 ---`);
  const slotsRes = await fetch(`${url}/rest/v1/slots?odf_id=in.("${odfId1}","${odfId2}")`, { headers });
  const slots = await slotsRes.json();
  console.log('Slots count:', slots?.length);
  console.log('Slots:', slots);

  console.log(`\n--- Checking Non-LIBRE Ports for ODF1 and ODF2 ---`);
  const portsRes = await fetch(`${url}/rest/v1/ports?odf_id=in.("${odfId1}","${odfId2}")&statut=neq.LIBRE`, { headers });
  const ports = await portsRes.json();
  console.log('Non-LIBRE ports count:', ports?.length);
  console.log('Non-LIBRE ports:', ports);

  console.log(`\n--- Checking Cables ---`);
  const cablesRes = await fetch(`${url}/rest/v1/cables_fibre`, { headers });
  const cables = await cablesRes.json();
  const filteredCables = (cables || []).filter(c => {
    return (c.port_source_id && (c.port_source_id.includes(odfId1) || c.port_source_id.includes(odfId2))) ||
           (c.port_dest_id && (c.port_dest_id.includes(odfId1) || c.port_dest_id.includes(odfId2)));
  });
  console.log('Connected cables count:', filteredCables.length);
  console.log('Connected cables:', filteredCables);
}

check();
