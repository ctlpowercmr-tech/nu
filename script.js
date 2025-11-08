class UtilisateurApp {
    constructor() {
        this.API_URL = CONFIG.API_URL;
        this.utilisateur = null;
        this.token = null;
        this.transactionActuelle = null;
        this.cameraActive = false;
        
        this.init();
    }
    
    init() {
        this.verifierAuthentification();
        this.setupEventListeners();
    }
    
    verifierAuthentification() {
        const token = localStorage.getItem('token');
        const utilisateur = localStorage.getItem('utilisateur');
        
        if (token && utilisateur) {
            this.token = token;
            this.utilisateur = JSON.parse(utilisateur);
            this.afficherDashboard();
        } else {
            this.afficherAuth();
        }
    }
    
    setupEventListeners() {
        // Navigation par onglets
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.nav-btn').dataset.section;
                this.changerSection(section);
            });
        });
        
        // Formulaire de connexion
        document.getElementById('form-connexion').addEventListener('submit', (e) => {
            e.preventDefault();
            this.connexion();
        });
        
        // Formulaire d'inscription
        document.getElementById('form-inscription').addEventListener('submit', (e) => {
            e.preventDefault();
            this.inscription();
        });
        
        // Tabs d'authentification
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.changerTabAuth(tab);
            });
        });
        
        // Rechargement
        document.getElementById('btn-recharger').addEventListener('click', () => {
            this.afficherModalRechargement();
        });
        
        document.getElementById('close-recharge').addEventListener('click', () => {
            this.cacherModalRechargement();
        });
        
        document.getElementById('form-recharge').addEventListener('submit', (e) => {
            e.preventDefault();
            this.rechargerCompte();
        });
        
        // Vider le compte
        document.getElementById('btn-vider').addEventListener('click', () => {
            this.viderCompte();
        });
        
        // Déconnexion
        document.getElementById('btn-deconnexion').addEventListener('click', () => {
            this.deconnexion();
        });
        
        // Transaction
        document.getElementById('btn-charger-transaction').addEventListener('click', () => {
            this.chargerTransaction();
        });
        
        document.getElementById('btn-payer').addEventListener('click', () => {
            this.effectuerPaiement();
        });
        
        document.getElementById('btn-annuler-transaction').addEventListener('click', () => {
            this.annulerTransaction();
        });
    }
    
    changerTabAuth(tab) {
        // Désactiver tous les tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Activer le tab sélectionné
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    }
    
    async connexion() {
        const email = document.getElementById('email-connexion').value;
        const password = document.getElementById('password-connexion').value;
        
        try {
            const response = await fetch(`${this.API_URL}/api/connexion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.token = result.token;
                this.utilisateur = result.user;
                
                // Sauvegarder dans le localStorage
                localStorage.setItem('token', this.token);
                localStorage.setItem('utilisateur', JSON.stringify(this.utilisateur));
                
                this.afficherDashboard();
                this.parler('Connexion réussie');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur connexion:', error);
            alert('Erreur: ' + error.message);
        }
    }
    
    async inscription() {
        const nom = document.getElementById('nom-inscription').value;
        const email = document.getElementById('email-inscription').value;
        const telephone = document.getElementById('telephone-inscription').value;
        const password = document.getElementById('password-inscription').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/api/inscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nom, email, telephone, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.token = result.token;
                this.utilisateur = result.user;
                
                localStorage.setItem('token', this.token);
                localStorage.setItem('utilisateur', JSON.stringify(this.utilisateur));
                
                this.afficherDashboard();
                this.parler('Inscription réussie');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur inscription:', error);
            alert('Erreur: ' + error.message);
        }
    }
    
    deconnexion() {
        localStorage.removeItem('token');
        localStorage.removeItem('utilisateur');
        this.token = null;
        this.utilisateur = null;
        this.afficherAuth();
        this.parler('Déconnexion réussie');
    }
    
    afficherAuth() {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('header-actions').innerHTML = `
            <button id="btn-connexion" class="btn-connexion">
                <i class="fas fa-sign-in-alt"></i> Connexion
            </button>
        `;
    }
    
    afficherDashboard() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        document.getElementById('header-actions').innerHTML = `
            <span>Bonjour, ${this.utilisateur.nom}</span>
        `;
        
        this.mettreAJourProfil();
        this.chargerSolde();
        this.chargerHistorique();
        this.demarrerScanner();
    }
    
    mettreAJourProfil() {
        document.getElementById('profil-nom').textContent = this.utilisateur.nom;
        document.getElementById('profil-email').textContent = this.utilisateur.email;
        document.getElementById('profil-telephone').textContent = this.utilisateur.telephone || 'Non renseigné';
        document.getElementById('profil-date').textContent = new Date(this.utilisateur.created_at).toLocaleDateString('fr-FR');
    }
    
    async chargerSolde() {
        if (!this.token) return;
        
        try {
            const response = await fetch(`${this.API_URL}/api/profil`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('solde-utilisateur').textContent = `${result.user.solde} FCFA`;
            }
        } catch (error) {
            console.error('Erreur chargement solde:', error);
        }
    }
    
    afficherModalRechargement() {
        document.getElementById('recharge-modal').classList.add('active');
    }
    
    cacherModalRechargement() {
        document.getElementById('recharge-modal').classList.remove('active');
    }
    
    async rechargerCompte() {
        const montant = document.getElementById('montant-recharge').value;
        const operateur = document.getElementById('operateur').value;
        const numeroTelephone = document.getElementById('numero-telephone').value;
        
        if (!montant || !operateur || !numeroTelephone) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/api/recharger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    montant: parseFloat(montant),
                    operateur,
                    numero_telephone: numeroTelephone
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.cacherModalRechargement();
                this.chargerSolde();
                this.parler(`Rechargement de ${montant} FCFA effectué avec succès`);
                alert(result.message);
                
                // Réinitialiser le formulaire
                document.getElementById('form-recharge').reset();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur rechargement:', error);
            alert('Erreur: ' + error.message);
        }
    }
    
    async viderCompte() {
        if (!confirm('Êtes-vous sûr de vouloir vider votre compte ?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/api/vider-compte`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.chargerSolde();
                this.parler('Compte vidé avec succès');
                alert(result.message);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur vider compte:', error);
            alert('Erreur: ' + error.message);
        }
    }
    
    changerSection(section) {
        // Désactiver toutes les sections
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        
        // Activer la section sélectionnée
        document.getElementById(`${section}-section`).classList.add('active');
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Si on revient au scanner, redémarrer la caméra
        if (section === 'scanner') {
            this.demarrerScanner();
        }
    }
    
    async demarrerScanner() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            const video = document.getElementById('camera-feed');
            video.srcObject = stream;
            this.cameraActive = true;
            
            this.scannerQRCode(stream);
        } catch (error) {
            console.error('Erreur accès caméra:', error);
        }
    }
    
    scannerQRCode(stream) {
        const video = document.getElementById('camera-feed');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        const scanFrame = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    try {
                        const data = JSON.parse(code.data);
                        if (data.transactionId) {
                            this.arreterCamera();
                            this.chargerTransaction(data.transactionId);
                        }
                    } catch (e) {
                        console.log('QR code non reconnu');
                    }
                }
            }
            requestAnimationFrame(scanFrame);
        };
        scanFrame();
    }
    
    arreterCamera() {
        if (this.cameraActive) {
            const video = document.getElementById('camera-feed');
            const stream = video.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            this.cameraActive = false;
        }
    }
    
    async chargerTransaction(transactionId = null) {
        const id = transactionId || document.getElementById('transaction-id').value.trim();
        
        if (!id) {
            alert('Veuillez saisir un ID de transaction');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/api/transaction/${id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.transactionActuelle = result.data;
                this.afficherDetailsTransaction();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur chargement transaction:', error);
            alert('Erreur: ' + error.message);
        }
    }
    
    afficherDetailsTransaction() {
        this.changerSection('transaction');
        
        document.getElementById('detail-transaction-id').textContent = this.transactionActuelle.id;
        document.getElementById('detail-montant').textContent = `${this.transactionActuelle.montant} FCFA`;
        document.getElementById('detail-statut').textContent = this.getStatutText(this.transactionActuelle.statut);
        
        this.afficherBoissonsTransaction();
        
        const btnPayer = document.getElementById('btn-payer');
        btnPayer.disabled = this.transactionActuelle.statut !== 'en_attente';
        
        if (this.transactionActuelle.statut !== 'en_attente') {
            btnPayer.textContent = `Transaction ${this.getStatutText(this.transactionActuelle.statut)}`;
        } else {
            btnPayer.textContent = 'Confirmer le Paiement';
        }
    }
    
    afficherBoissonsTransaction() {
        const listeElement = document.getElementById('liste-boissons');
        listeElement.innerHTML = '';
        
        this.transactionActuelle.boissons.forEach(boisson => {
            const item = document.createElement('div');
            item.className = 'boisson-item';
            item.innerHTML = `
                <span>${boisson.icone || '🥤'} ${boisson.nom}</span>
                <span>${boisson.prix} FCFA</span>
            `;
            listeElement.appendChild(item);
        });
    }
    
    getStatutText(statut) {
        const statuts = {
            'en_attente': 'En attente',
            'paye': 'Payé',
            'annule': 'Annulé',
            'expire': 'Expiré'
        };
        return statuts[statut] || statut;
    }
    
    async effectuerPaiement() {
        if (!this.transactionActuelle) return;
        
        try {
            const response = await fetch(`${this.API_URL}/api/transaction/${this.transactionActuelle.id}/payer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.chargerSolde();
                this.parler('Paiement réussi! Votre commande sera prête dans 4 secondes.');
                alert(result.message);
                
                // Recharger l'historique
                this.chargerHistorique();
                
                // Revenir au scanner après paiement
                setTimeout(() => {
                    this.changerSection('scanner');
                    this.demarrerScanner();
                }, 2000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur paiement:', error);
            alert('Erreur: ' + error.message);
        }
    }
    
    annulerTransaction() {
        this.transactionActuelle = null;
        this.changerSection('scanner');
        this.demarrerScanner();
    }
    
    async chargerHistorique() {
        if (!this.token) return;
        
        try {
            const response = await fetch(`${this.API_URL}/api/historique?limit=20`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.afficherHistorique(result.data);
            }
        } catch (error) {
            console.error('Erreur chargement historique:', error);
        }
    }
    
    afficherHistorique(transactions) {
        const historiqueElement = document.getElementById('historique-transactions');
        
        if (transactions.length === 0) {
            historiqueElement.innerHTML = '<div class="transaction-item">Aucune transaction</div>';
            return;
        }
        
        historiqueElement.innerHTML = '';
        
        transactions.forEach(transaction => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <div>${transaction.id}</div>
                    <div class="transaction-montant">${transaction.montant} FCFA</div>
                </div>
                <div class="transaction-statut ${transaction.statut}">
                    ${this.getStatutText(transaction.statut)}
                </div>
            `;
            historiqueElement.appendChild(item);
        });
    }
    
    parler(message) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'fr-FR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            speechSynthesis.speak(utterance);
        }
        
        // Jouer un son de notification
        const audio = document.getElementById('audio-notification');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', function() {
    window.utilisateurApp = new UtilisateurApp();
});
