class ApplicationUtilisateur {
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
        const token = localStorage.getItem('ctl_token');
        const utilisateur = localStorage.getItem('ctl_utilisateur');
        
        if (token && utilisateur) {
            this.token = token;
            this.utilisateur = JSON.parse(utilisateur);
            this.afficherApplication();
        } else {
            this.afficherAuthentification();
        }
    }
    
    afficherAuthentification() {
        document.getElementById('page-connexion').classList.add('active');
        document.getElementById('page-app').classList.remove('active');
    }
    
    afficherApplication() {
        document.getElementById('page-connexion').classList.remove('active');
        document.getElementById('page-app').classList.add('active');
        
        this.mettreAJourInterfaceUtilisateur();
        this.chargerSolde();
        this.demarrerScanner();
    }
    
    mettreAJourInterfaceUtilisateur() {
        if (this.utilisateur) {
            document.getElementById('user-nom').textContent = this.utilisateur.nom;
            document.getElementById('user-email').textContent = this.utilisateur.email;
            document.getElementById('profil-nom').textContent = this.utilisateur.nom;
            document.getElementById('profil-email').textContent = this.utilisateur.email;
        }
    }
    
    setupEventListeners() {
        // Authentification
        document.getElementById('form-connexion').addEventListener('submit', (e) => this.connexion(e));
        document.getElementById('form-inscription').addEventListener('submit', (e) => this.inscription(e));
        
        // Tabs authentification
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.changerTabAuth(tab);
            });
        });
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.closest('.nav-btn').getAttribute('data-page');
                this.changerPage(page);
            });
        });
        
        // Actions
        document.getElementById('btn-deconnexion').addEventListener('click', () => this.deconnexion());
        document.getElementById('btn-deconnexion-profil').addEventListener('click', () => this.deconnexion());
        document.getElementById('btn-recharger').addEventListener('click', () => this.afficherModalRechargement());
        document.getElementById('btn-historique').addEventListener('click', () => this.chargerHistorique());
        document.getElementById('btn-rafraichir').addEventListener('click', () => this.chargerHistorique());
        
        // Scanner
        document.getElementById('btn-charger-transaction').addEventListener('click', () => this.chargerTransaction());
        document.getElementById('transaction-id').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.chargerTransaction();
        });
        
        // Transactions
        document.getElementById('btn-back-transaction').addEventListener('click', () => this.retourAuScanner());
        document.getElementById('btn-annuler-transaction').addEventListener('click', () => this.annulerTransaction());
        document.getElementById('btn-payer').addEventListener('click', () => this.afficherModalPaiement());
        
        // Modals
        document.getElementById('fermer-rechargement').addEventListener('click', () => this.fermerModalRechargement());
        document.getElementById('fermer-paiement').addEventListener('click', () => this.fermerModalPaiement());
        document.getElementById('btn-confirmer-rechargement').addEventListener('click', () => this.confirmerRechargement());
        document.getElementById('btn-confirmer-paiement').addEventListener('click', () => this.confirmerPaiement());
        
        // Filtres historique
        document.querySelectorAll('.filtre-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filtre = e.target.getAttribute('data-filtre');
                this.filtrerHistorique(filtre);
            });
        });
        
        // Options rechargement
        document.querySelectorAll('.montant-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.montant-option').forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        document.querySelectorAll('.methode-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.methode-option').forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }
    
    changerTabAuth(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`form-${tab}`).classList.add('active');
    }
    
    async connexion(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch(`${this.API_URL}/api/connexion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.token = result.token;
                this.utilisateur = result.utilisateur;
                
                localStorage.setItem('ctl_token', this.token);
                localStorage.setItem('ctl_utilisateur', JSON.stringify(this.utilisateur));
                
                this.afficherApplication();
                this.afficherNotification('✅ Connexion réussie!', 'success');
            } else {
                this.afficherNotification('❌ ' + result.error, 'error');
            }
        } catch (error) {
            this.afficherNotification('❌ Erreur de connexion au serveur', 'error');
        }
    }
    
    async inscription(e) {
        e.preventDefault();
        
        const nom = document.getElementById('inscription-nom').value;
        const email = document.getElementById('inscription-email').value;
        const telephone = document.getElementById('inscription-telephone').value;
        const password = document.getElementById('inscription-password').value;
        
        try {
            const response = await fetch(`${this.API_URL}/api/inscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom, email, telephone, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.afficherNotification('✅ Compte créé avec succès!', 'success');
                this.changerTabAuth('connexion');
                
                // Pré-remplir le formulaire de connexion
                document.getElementById('login-email').value = email;
                document.getElementById('login-password').value = password;
            } else {
                this.afficherNotification('❌ ' + result.error, 'error');
            }
        } catch (error) {
            this.afficherNotification('❌ Erreur de connexion au serveur', 'error');
        }
    }
    
    deconnexion() {
        localStorage.removeItem('ctl_token');
        localStorage.removeItem('ctl_utilisateur');
        this.token = null;
        this.utilisateur = null;
        this.afficherAuthentification();
        this.afficherNotification('👋 À bientôt!', 'info');
    }
    
    changerPage(page) {
        document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(`page-${page}`).classList.add('active');
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        if (page === 'transactions') {
            this.chargerHistorique();
        } else if (page === 'profil') {
            this.mettreAJourProfil();
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
            
            this.scannerQRCode();
        } catch (error) {
            console.error('Erreur accès caméra:', error);
        }
    }
    
    scannerQRCode() {
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
            this.afficherNotification('❌ Veuillez saisir un ID de transaction', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/api/transaction/${id}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.transactionActuelle = result.data;
                this.afficherDetailsTransaction();
                this.changerPage('transaction');
            } else {
                this.afficherNotification('❌ ' + result.error, 'error');
            }
        } catch (error) {
            this.afficherNotification('❌ Erreur de connexion au serveur', 'error');
        }
    }
    
    afficherDetailsTransaction() {
        if (!this.transactionActuelle) return;
        
        document.getElementById('detail-transaction-id').textContent = this.transactionActuelle.id;
        document.getElementById('detail-montant').textContent = `${this.transactionActuelle.montant} FCFA`;
        document.getElementById('detail-statut').textContent = this.getStatutText(this.transactionActuelle.statut);
        
        this.afficherBoissonsTransaction();
        
        const btnPayer = document.getElementById('btn-payer');
        btnPayer.disabled = this.transactionActuelle.statut !== 'en_attente';
        
        if (this.transactionActuelle.statut !== 'en_attente') {
            btnPayer.textContent = `Transaction ${this.getStatutText(this.transactionActuelle.statut)}`;
        } else {
            btnPayer.innerHTML = '<span>💰 Payer maintenant</span>';
        }
    }
    
    afficherBoissonsTransaction() {
        const listeElement = document.getElementById('liste-boissons');
        listeElement.innerHTML = '';
        
        if (this.transactionActuelle.boissons && this.transactionActuelle.boissons.length > 0) {
            this.transactionActuelle.boissons.forEach(boisson => {
                const item = document.createElement('div');
                item.className = 'transaction-item';
                item.innerHTML = `
                    <div class="transaction-info">
                        <h4>${boisson.nom}</h4>
                        <p>${boisson.taille} - ${boisson.prix} FCFA</p>
                    </div>
                `;
                listeElement.appendChild(item);
            });
        }
    }
    
    getStatutText(statut) {
        const statuts = {
            'en_attente': 'En attente',
            'paye': 'Payée',
            'annule': 'Annulée',
            'expire': 'Expirée',
            'recharge': 'Rechargement'
        };
        return statuts[statut] || statut;
    }
    
    afficherModalPaiement() {
        if (!this.transactionActuelle) return;
        
        const montant = this.transactionActuelle.montant;
        const nouveauSolde = this.utilisateur.solde - montant;
        
        document.getElementById('paiement-montant').textContent = `${montant} FCFA`;
        document.getElementById('solde-apres-paiement').textContent = `${nouveauSolde} FCFA`;
        
        document.getElementById('modal-paiement').classList.add('active');
    }
    
    fermerModalPaiement() {
        document.getElementById('modal-paiement').classList.remove('active');
    }
    
    async confirmerPaiement() {
        if (!this.transactionActuelle) return;
        
        try {
            const response = await fetch(`${this.API_URL}/api/transaction/${this.transactionActuelle.id}/payer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ methode: 'solde' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.utilisateur.solde = result.nouveauSolde;
                localStorage.setItem('ctl_utilisateur', JSON.stringify(this.utilisateur));
                
                this.mettreAJourSolde();
                this.fermerModalPaiement();
                this.afficherNotification('✅ ' + result.message, 'success');
                
                // Synthèse vocale
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Paiement réussi! Votre commande sera prête dans 4 secondes');
                    utterance.lang = 'fr-FR';
                    speechSynthesis.speak(utterance);
                }
                
                setTimeout(() => {
                    this.retourAuScanner();
                }, 4000);
            } else {
                this.afficherNotification('❌ ' + result.error, 'error');
            }
        } catch (error) {
            this.afficherNotification('❌ Erreur lors du paiement', 'error');
        }
    }
    
    annulerTransaction() {
        this.transactionActuelle = null;
        this.retourAuScanner();
    }
    
    retourAuScanner() {
        this.changerPage('scanner');
        document.getElementById('transaction-id').value = '';
        this.demarrerScanner();
    }
    
    afficherModalRechargement() {
        document.getElementById('modal-rechargement').classList.add('active');
    }
    
    fermerModalRechargement() {
        document.getElementById('modal-rechargement').classList.remove('active');
    }
    
    async confirmerRechargement() {
        const montantOption = document.querySelector('.montant-option.active');
        const montantPersonnalise = document.getElementById('montant-personnalise').value;
        const methodeOption = document.querySelector('.methode-option.active');
        
        let montant = 0;
        
        if (montantPersonnalise) {
            montant = parseFloat(montantPersonnalise);
        } else if (montantOption) {
            montant = parseFloat(montantOption.getAttribute('data-montant'));
        }
        
        if (!montant || montant <= 0) {
            this.afficherNotification('❌ Veuillez sélectionner un montant valide', 'error');
            return;
        }
        
        if (!methodeOption) {
            this.afficherNotification('❌ Veuillez sélectionner une méthode de paiement', 'error');
            return;
        }
        
        const methode = methodeOption.getAttribute('data-methode');
        
        try {
            const response = await fetch(`${this.API_URL}/api/recharger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ montant, methode })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.utilisateur.solde = result.nouveauSolde;
                localStorage.setItem('ctl_utilisateur', JSON.stringify(this.utilisateur));
                
                this.mettreAJourSolde();
                this.fermerModalRechargement();
                this.afficherNotification('✅ ' + result.message, 'success');
                
                // Réinitialiser les champs
                document.querySelectorAll('.montant-option').forEach(o => o.classList.remove('active'));
                document.getElementById('montant-personnalise').value = '';
            } else {
                this.afficherNotification('❌ ' + result.error, 'error');
            }
        } catch (error) {
            this.afficherNotification('❌ Erreur lors du rechargement', 'error');
        }
    }
    
    async chargerHistorique() {
        try {
            const response = await fetch(`${this.API_URL}/api/historique`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.afficherHistorique(result.data);
            }
        } catch (error) {
            this.afficherNotification('❌ Erreur chargement historique', 'error');
        }
    }
    
    afficherHistorique(transactions) {
        const historiqueElement = document.getElementById('historique-transactions');
        historiqueElement.innerHTML = '';
        
        if (transactions.length === 0) {
            historiqueElement.innerHTML = '<div class="transaction-item">Aucune transaction</div>';
            return;
        }
        
        transactions.forEach(transaction => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.setAttribute('data-statut', transaction.statut);
            
            const isRecharge = transaction.statut === 'recharge';
            const montantClass = isRecharge ? 'positif' : 'negatif';
            const montantPrefix = isRecharge ? '+' : '-';
            
            item.innerHTML = `
                <div class="transaction-info">
                    <h4>${isRecharge ? 'Rechargement' : 'Achat boissons'}</h4>
                    <p>${new Date(transaction.date).toLocaleDateString()} • ${transaction.id}</p>
                    ${transaction.methodePaiement ? `<p>Méthode: ${transaction.methodePaiement}</p>` : ''}
                </div>
                <div class="transaction-montant ${montantClass}">
                    ${montantPrefix}${transaction.montant} FCFA
                </div>
            `;
            
            historiqueElement.appendChild(item);
        });
        
        document.getElementById('profil-transactions').textContent = transactions.length;
    }
    
    filtrerHistorique(filtre) {
        const items = document.querySelectorAll('.transaction-item');
        
        items.forEach(item => {
            if (filtre === 'tous' || item.getAttribute('data-statut') === filtre) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
        
        document.querySelectorAll('.filtre-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filtre="${filtre}"]`).classList.add('active');
    }
    
    mettreAJourProfil() {
        if (this.utilisateur) {
            document.getElementById('profil-solde').textContent = `${this.utilisateur.solde} FCFA`;
        }
    }
    
    async chargerSolde() {
        try {
            const response = await fetch(`${this.API_URL}/api/profil`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.utilisateur.solde = result.data.solde;
                localStorage.setItem('ctl_utilisateur', JSON.stringify(this.utilisateur));
                this.mettreAJourSolde();
            }
        } catch (error) {
            console.error('Erreur chargement solde:', error);
        }
    }
    
    mettreAJourSolde() {
        if (this.utilisateur) {
            const solde = this.utilisateur.solde || 0;
            document.getElementById('solde-utilisateur').textContent = `${solde} FCFA`;
            document.getElementById('profil-solde').textContent = `${solde} FCFA`;
        }
    }
    
    afficherNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        const iconElement = document.getElementById('notification-icon');
        
        messageElement.textContent = message;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        iconElement.textContent = icons[type] || 'ℹ️';
        notification.style.display = 'flex';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Initialisation
const app = new ApplicationUtilisateur();
