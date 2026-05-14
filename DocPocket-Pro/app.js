const SALT = "BKH_GLOBAL_PROTECT_2026";
const MASTER_DB_KEY = "SECRET-BKH-DOC";
let patients = [];
let patientActuelId = null;
let consultationModifId = null;

// INITIALISATION
window.onload = () => {
    const license = localStorage.getItem('doc_license_active');
    const security = localStorage.getItem('doc_security_cfg');

    if(!license) {
        document.getElementById('screen-activation').classList.remove('hidden');
    } else if(!security) {
        document.getElementById('screen-config-pin').classList.remove('hidden');
    } else {
        document.getElementById('screen-lock').classList.remove('hidden');
    }
};

// SÉCURITÉ ET LICENCE
function validerActivation() {
    const name = document.getElementById('lic-name').value.trim().toUpperCase();
    const key = document.getElementById('lic-key').value.trim();
    const expected = CryptoJS.HmacSHA256(name, SALT).toString().toUpperCase().match(/.{1,4}/g).slice(0, 5).join('-');
    
    if(key === expected && name.length > 2) {
        localStorage.setItem('doc_license_active', name);
        location.reload();
    } else {
        alert("Clé de licence invalide pour ce nom.");
    }
}

function enregistrerConfigSecu() {
    const p1 = document.getElementById('cfg-pin').value;
    const p2 = document.getElementById('cfg-pin-confirm').value;
    if (p1 === p2 && p1.length >= 4) {
        const cfg = { pinHash: CryptoJS.SHA256(p1).toString() };
        localStorage.setItem('doc_security_cfg', JSON.stringify(cfg));
        location.reload();
    } else {
        alert("Les codes PIN doivent être identiques et comporter au moins 4 chiffres.");
    }
}

function deverrouillerParPin() {
    const pin = document.getElementById('lock-pin-input').value;
    const cfg = JSON.parse(localStorage.getItem('doc_security_cfg'));
    if (CryptoJS.SHA256(pin).toString() === cfg.pinHash) {
        document.getElementById('screen-lock').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        chargerDB();
    } else {
        alert("Code PIN incorrect.");
        document.getElementById('lock-pin-input').value = "";
    }
}

// GESTION CLINIQUE
function calculerAgeAuto(v) {
    if(v.length === 4) {
        const age = new Date().getFullYear() - parseInt(v);
        document.getElementById('p-age').value = age + " ANS";
    }
}

function chargerDB() {
    const stored = localStorage.getItem('doc_patients_final_db');
    if (stored) {
        try {
            const bytes = CryptoJS.AES.decrypt(stored, MASTER_DB_KEY);
            patients = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (e) { patients = []; }
    }
    afficherPatients();
}

function sauvegarderDB() {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(patients), MASTER_DB_KEY).toString();
    localStorage.setItem('doc_patients_final_db', encrypted);
}

function validerSaisie() {
    const dataV = {
        id: Date.now(),
        date: new Date().toLocaleString('fr-FR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}),
        ta: document.getElementById('c-ta').value,
        pouls: document.getElementById('c-pouls').value,
        temp: document.getElementById('c-temp').value,
        fr: document.getElementById('c-fr').value,
        sat: document.getElementById('c-sat').value,
        motif: document.getElementById('c-motif').value,
        general: document.getElementById('c-general').value,
        hemo: document.getElementById('c-hemo').value,
        respi: document.getElementById('c-respi').value,
        abd: document.getElementById('c-abd').value,
        neuro: document.getElementById('c-neuro').value,
        reste: document.getElementById('c-reste').value,
        traitement: document.getElementById('c-traitement').value
    };
    
    if (patientActuelId === null) {
        const nom = document.getElementById('p-nom').value.trim().toUpperCase();
        if(!nom) return alert("Le nom est requis.");
        const p = {
            id: Date.now(), nom,
            dob: `${document.getElementById('p-jj').value}/${document.getElementById('p-mm').value}/${document.getElementById('p-aaaa').value}`,
            origine: document.getElementById('p-origine').value,
            age: document.getElementById('p-age').value,
            tel: document.getElementById('p-tel').value,
            visites: [dataV]
        };
        patients.unshift(p);
        patientActuelId = p.id;
    } else {
        const p = patients.find(x => x.id === patientActuelId);
        if(consultationModifId) {
            const v = p.visites.find(x => x.id === consultationModifId);
            Object.assign(v, dataV, {id: v.id, date: v.date});
        } else {
            p.visites.unshift(dataV);
        }
    }
    sauvegarderDB();
    fermerModal();
    voirDossier(patientActuelId);
}

function afficherPatients() {
    const q = document.getElementById('search').value.toUpperCase();
    document.getElementById('patientList').innerHTML = patients.filter(p => p.nom.includes(q)).map(p => `
        <div onclick="voirDossier(${p.id})" class="medical-card flex justify-between items-center cursor-pointer">
            <div>
                <h3 class="font-black text-lg uppercase text-slate-800">${p.nom}</h3>
                <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest">${p.dob} • ${p.visites.length} Visite(s)</p>
            </div>
            <span class="text-blue-200 font-bold">❯</span>
        </div>`).join('');
}

function voirDossier(id) {
    patientActuelId = id;
    const p = patients.find(x => x.id === id);
    document.getElementById('vue-liste').classList.add('hidden');
    document.getElementById('vue-dossier').classList.remove('hidden');
    document.getElementById('view-nom').innerText = p.nom;
    document.getElementById('view-infos').innerText = `Né le ${p.dob} (${p.origine}) • Tél: ${p.tel}`;
    
    document.getElementById('historiqueList').innerHTML = p.visites.map(v => `
        <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div class="flex justify-between items-center mb-3">
                <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">${v.date}</span>
                <button onclick="ouvrirConsultation(${v.id})" class="text-blue-500 text-[10px] font-bold uppercase">Modifier</button>
            </div>
            <div class="grid grid-cols-5 gap-1 text-[9px] font-bold mb-2">
                <span class="text-red-600">TA: ${v.ta}</span>
                <span class="text-green-600">P: ${v.pouls}</span>
                <span class="text-orange-600">T: ${v.temp}°</span>
                <span>FR: ${v.fr}</span>
                <span class="text-blue-600">Sat: ${v.sat}%</span>
            </div>
            <div class="text-[10px] leading-relaxed text-slate-700">
                <b>Motif:</b> ${v.motif.substring(0, 50)}...
            </div>
        </div>`).join('');
}

// NAVIGATION
function retourListe() {
    patientActuelId = null;
    document.getElementById('vue-liste').classList.remove('hidden');
    document.getElementById('vue-dossier').classList.add('hidden');
    afficherPatients();
}

function ouvrirNouveauPatient() {
    patientActuelId = null;
    consultationModifId = null;
    resetForm();
    document.getElementById('form-patient-info').classList.remove('hidden');
    document.getElementById('modal-consult').classList.remove('hidden');
}

function ouvrirConsultation(cId = null) {
    consultationModifId = cId;
    document.getElementById('form-patient-info').classList.add('hidden');
    if(cId) {
        const v = patients.find(p => p.id === patientActuelId).visites.find(x => x.id === cId);
        fillForm(v);
    } else {
        resetForm();
    }
    document.getElementById('modal-consult').classList.remove('hidden');
}

function fermerModal() { document.getElementById('modal-consult').classList.add('hidden'); }

function resetForm() {
    const ids = ['p-nom', 'p-jj', 'p-mm', 'p-aaaa', 'p-age', 'p-origine', 'p-tel', 'c-ta', 'c-pouls', 'c-temp', 'c-fr', 'c-sat', 'c-motif', 'c-general', 'c-hemo', 'c-respi', 'c-abd', 'c-neuro', 'c-reste', 'c-traitement'];
    ids.forEach(id => document.getElementById(id).value = "");
}

function fillForm(v) {
    document.getElementById('c-ta').value = v.ta;
    document.getElementById('c-pouls').value = v.pouls;
    document.getElementById('c-temp').value = v.temp;
    document.getElementById('c-fr').value = v.fr;
    document.getElementById('c-sat').value = v.sat;
    document.getElementById('c-motif').value = v.motif;
    document.getElementById('c-general').value = v.general;
    document.getElementById('c-hemo').value = v.hemo;
    document.getElementById('c-respi').value = v.respi;
    document.getElementById('c-abd').value = v.abd;
    document.getElementById('c-neuro').value = v.neuro;
    document.getElementById('c-reste').value = v.reste;
    document.getElementById('c-traitement').value = v.traitement;
}

function supprimerPatientTotal() {
    if(confirm("Confirmer la suppression définitive de ce dossier ?")) {
        patients = patients.filter(p => p.id !== patientActuelId);
        sauvegarderDB();
        retourListe();
    }
}

// PDF EXPORT
function preparerExport() {
    const p = patients.find(x => x.id === patientActuelId);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text(`DocPocket Pro - Dossier Médical`, 20, 20);
    
    doc.setFontSize(14);
    doc.text(`Patient : ${p.nom}`, 20, 32);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Identité : Né le ${p.dob} (${p.age}) | Origine : ${p.origine} | Tél : ${p.tel}`, 20, 40);
    doc.line(20, 44, 190, 44);

    let y = 55;

    p.visites.forEach((v) => {
        if (y > 260) { doc.addPage(); y = 20; }

        doc.setFont(undefined, 'bold');
        doc.text(`VISITE DU ${v.date.toUpperCase()}`, 20, y);
        y += 8;

        doc.setFont(undefined, 'normal');
        doc.text(`PARAMÈTRES : TA ${v.ta} | Pouls ${v.pouls} | T ${v.temp}°C | FR ${v.fr} | Sat ${v.sat}%`, 20, y);
        y += 8;

        const detail = `Motif: ${v.motif}\nExamen: Gen: ${v.general} | Hem: ${v.hemo} | Res: ${v.respi} | Abd: ${v.abd} | Neu: ${v.neuro} | Reste: ${v.reste}\nTraitement: ${v.traitement}`;
        const splitText = doc.splitTextToSize(detail, 170);
        doc.text(splitText, 20, y);
        
        y += (splitText.length * 6) + 10;
        doc.line(20, y-5, 60, y-5);
        y += 5;
    });

    doc.save(`DocPocket_Pro_${p.nom}.pdf`);
}
