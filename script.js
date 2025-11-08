class ApplicationUtilisateur {
    constructor() {
        this.API_URL = CONFIG.API_URL;
        this.token = localStorage.getItem(CONFIG.JWT_KEY);
        this.userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
        this.cameraActive = false;
        this.currentStream = null;
        this.operateurSelectionne = null;
        this.montantSelectionne = null;
        this.transactionActuelle = null;
        this.soldeVisible = true;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.verifierAuthentification();
        this.initialiserDateTime();
        this.chargerDonneesInitiales();
    }
    
    setupEventListeners() {
        // Navigation entre écrans
        document.getElementById('btn-show-inscription').addEventListener('click', () => this.afficherEcran('inscription'));
        document.getElementById('btn-show-connexion').addEventListener('click', () => this.afficherEcran('connexion'));
        
        // Formulaires d'authentification
        document.getElementById('form-connexion').addEventListener('submit', (e) => this.connexion(e));
        document.getElementById('form-inscription').addEventListener('submit', (e) => this.inscription(e));
        
        // Navigation principale
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.changerOnglet(e.currentTarget.getAttribute('data-tab')));
        });
        
        // Actions rapides
        document.getElementById('btn-recharger-rapide').addEventListener('click', () => this.changerOnglet('recharger'));
        document.getElementById('btn-scanner-rapide').addEventListener('click', () => this.changerOnglet('scanner'));
        document.getElementById('btn-historique-rapide').addEventListener('click', () => this.changerOnglet('historique'));
        
        // Scanner
        document.getElementById('btn-switch-camera').addEventListener('click', () => this.switchCamera());
        document.getElementById('btn-toggle-flash').addEventListener('click', () => this.toggleFlash());
        document.getElementById('btn-charger-manuel').addEventListener('click', () => this.chargerTransactionManuelle());
        
        // Recharger
        document.querySelectorAll('.operateur-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectionnerOperateur(e.currentTarget.getAttribute('data-operateur')));
        });
        
        document.querySelectorAll('.montant-rapide').forEach(montant => {
            montant.addEventListener('click', (e) => this.selectionnerMontant(parseInt(e.currentTarget.getAttribute('data-montant'))));
        });
        
        document.getElementById('montant-personnalise').addEventListener('input', (e) => this.selectionnerMontantPersonnalise(e.target.value));
        document.getElementById('btn-confirmer-recharge').addEventListener('click', () => this.confirmerRecharge());
        
        // Transaction
        document.getElementById('btn-payer-transaction').addEventListener('click', () => this.effectuerPaiement());
        document.getElementById('btn-annuler-transaction').addEventListener('click', () => this.annulerTransaction());
        document.getElementById('btn-retour-transaction').addEventListener('click', () => this.changerOnglet('accueil'));
        
        // Profil
        document.getElementById('btn-deconnexion').addEventListener('click', () => this.deconnexion());
        document.getElementById('btn-deconnexion-profil').addEventListener('click', () => this.deconnexion());
        
        // Solde
        document.getElementById('toggle-solde').addEventListener('click', () => this.toggleSolde());
        
        // Modal
        document.getElementById('btn-modal-ok').addEventListener('click', () => this.fermerModal());
        document.querySelector('.btn-close-modal').addEventListener('click', () => this.fermerModal());
        
        // Voir tout
        document.querySelectorAll('.btn-voir-tout').forEach(btn => {
            btn.addEventListener('click', (e) => this.changerOnglet(e.currentTarget.getAttribute('data-tab')));
        });
        
        // Filtres historique
        document.getElementById('filtre-statut').addEventListener('change', () => this.filtrerHistorique());
        document.getElementById('filtre-periode').addEventListener('change', () => this.filtrerHistorique());
        
        // Toggle password
        document.querySelectorAll('.btn-toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePassword(e.currentTarget));
        });
    }
    
    async verifierAuthentification() {
        if (this.token && this.userData.id) {
            try {
                const response = await fetch(`${this.API_URL}/api/solde`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
                
                if (response.ok) {
                    this.afficherEcran('principal');
                    this.mettreAJourHeader();
                    this.chargerSolde();
                    this.chargerHistorique();
                } else {
                    this.deconnexion();
                }
            } catch (error) {
                console.error('Erreur vérification auth:', error);
                this.deconnexion();
            }
        } else {
            this.afficherEcran('connexion');
        }
    }
    
    afficherEcran(ecran) {
        document.querySelectorAll('.ecran').forEach(e => e.classList.remove('active'));
        document.getElementById(`ecran-${ecran}`).classList.add('active');
        
        if (ecran === 'scanner') {
            this.demarrerScanner();
        } else if (ecran === 'principal') {
            this.changerOnglet('accueil');
        } else {
            this.arreterCamera();
        }
    }
    
    changerOnglet(onglet) {
        // Mettre à jour la navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-tab') === onglet) {
                item.classList.add('active');
            }
        });
        
        // Afficher le contenu
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(onglet).classList.add('active');
        
        // Actions spécifiques à l'onglet
        if (onglet === 'scanner') {
            this.demarrerScanner();
        } else if (onglet === 'historique') {
            this.chargerHistorique();
        } else if (onglet === 'profil') {
            this.mettreAJourProfil();
        } else {
            this.arreterCamera();
        }
    }
    
    async demarrerScanner() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            const video = document.getElementById('camera-feed');
            video.srcObject = stream;
            this.currentStream = stream;
            this.cameraActive = true;
            
            this.scannerQRCode();
        } catch (error) {
            console.error('Erreur accès caméra:', error);
            this.afficherMessage('Impossible d\'accéder à la caméra. Veuillez vérifier les permissions.', 'error');
        }
    }
    
    scannerQRCode() {
        const video = document.getElementById('camera-feed');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        const scanFrame = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA && this.cameraActive) {
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
                            this.jouerSon('scan');
                            this.chargerTransaction(data.transactionId);
                        }
                    } catch (e) {
                        console.log('QR code non reconnu:', e);
                    }
                }
            }
            
            if (this.cameraActive) {
                requestAnimationFrame(scanFrame);
            }
        };
        
        scanFrame();
    }
    
    arreterCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.cameraActive = false;
    }
    
    async switchCamera() {
        this.arreterCamera();
        
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 1) {
                // Implémentation basique du switch de caméra
                const constraints = { 
                    video: { 
                        facingMode: this.currentFacingMode === 'user' ? 'environment' : 'user'
                    } 
                };
                
                this.currentFacingMode = constraints.video.facingMode;
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                const video = document.getElementById('camera-feed');
                video.srcObject = stream;
                this.currentStream = stream;
            }
        } catch (error) {
            console.error('Erreur switch caméra:', error);
        }
    }
    
    toggleFlash() {
        // Implémentation basique du flash (nécessite une vraie implémentation pour mobile)
        this.afficherMessage('Fonction flash non disponible sur ce navigateur', 'info');
    }
    
    async connexion(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch(`${this.API_URL}/api/auth/connexion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.token = result.token;
                this.userData = result.user;
                
                localStorage.setItem(CONFIG.JWT_KEY, this.token);
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(this.userData));
                
                this.afficherEcran('principal');
                this.mettreAJourHeader();
                this.chargerSolde();
                this.chargerHistorique();
                
                this.afficherMessage('Connexion réussie!', 'success');
            } else {
                this.afficherMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Erreur connexion:', error);
            this.afficherMessage('Erreur de connexion au serveur', 'error');
        }
    }
    
    async inscription(e) {
        e.preventDefault();
        
        const nom = document.getElementById('inscription-nom').value;
        const email = document.getElementById('inscription-email').value;
        const telephone = document.getElementById('inscription-telephone').value;
        const password = document.getElementById('inscription-password').value;
        const confirmPassword = document.getElementById('inscription-confirm').value;
        
        if (password !== confirmPassword) {
            this.afficherMessage('Les mots de passe ne correspondent pas', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.afficherMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_URL}/api/auth/inscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nom, email, telephone, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.afficherMessage('Compte créé avec succès! Veuillez vous connecter.', 'success');
                this.afficherEcran('connexion');
                
                // Réinitialiser le formulaire
                document.getElementById('form-inscription').reset();
            } else {
                this.afficherMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Erreur inscription:', error);
            this.afficherMessage('Erreur de connexion au serveur', 'error');
        }
    }
    
    deconnexion() {
        this.token = null;
        this.userData = {};
        localStorage.removeItem(CONFIG.JWT_KEY);
        localStorage.removeItem(CONFIG.USER_DATA_KEY);
        this.arreterCamera();
        this.afficherEcran('connexion');
    }
    
    mettreAJourHeader() {
        document.getElementById('header-user-name').textContent = this.userData.nom || 'Utilisateur';
    }
    
    mettreAJourProfil() {
        document.getElementById('profil-nom').textContent = this.userData.nom || 'Utilisateur';
        document.getElementById('profil-email').textContent = this.userData.email || 'Non renseigné';
        document.getElementById('profil-telephone').textContent = this.userData.telephone || 'Non renseigné';
    }
    
    async chargerSolde() {
        try {
            const response = await fetch(`${this.API_URL}/api/solde`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.userData.solde = result.solde;
                    this.mettreAJourSolde();
                }
            }
        } catch (error) {
            console.error('Erreur chargement solde:', error);
        }
    }
    
    mettreAJourSolde() {
        const soldeElement = document.getElementById('solde-montant');
        if (this.soldeVisible) {
            soldeElement.textContent = this.formatMontant(this.userData.solde || 0);
        } else {
            soldeElement.textContent = '•••••';
        }
    }
    
    toggleSolde() {
        this.soldeVisible = !this.soldeVisible;
        const btnEye = document.getElementById('toggle-solde');
        btnEye.innerHTML = this.soldeVisible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        this.mettreAJourSolde();
    }
    
    async chargerTransactionManuelle() {
        const transactionId = document.getElementById('transaction-id-manuel').value.trim();
        if (!transactionId) {
            this.afficherMessage('Veuillez entrer un ID de transaction', 'error');
            return;
        }
        
        this.chargerTransaction(transactionId);
    }
    
    async chargerTransaction(transactionId) {
        try {
            const response = await fetch(`${this.API_URL}/api/transaction/${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.transactionActuelle = result.data;
                this.afficherDetailsTransaction();
                this.changerOnglet('transaction');
            } else {
                this.afficherMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Erreur chargement transaction:', error);
            this.afficherMessage('Erreur de connexion au serveur', 'error');
        }
    }
    
    afficherDetailsTransaction() {
        if (!this.transactionActuelle) return;
        
        document.getElementById('detail-transaction-id').textContent = this.transactionActuelle.id;
        document.getElementById('detail-montant').textContent = this.formatMontant(this.transactionActuelle.montant) + ' FCFA';
        document.getElementById('detail-statut').textContent = this.getStatutText(this.transactionActuelle.statut);
        document.getElementById('detail-statut').className = `value statut statut-${this.transactionActuelle.statut}`;
        document.getElementById('detail-date').textContent = new Date(this.transactionActuelle.date).toLocaleString();
        
        // Afficher les boissons
        const listeBoissons = document.getElementById('liste-boissons');
        listeBoissons.innerHTML = '';
        
        if (this.transactionActuelle.boissons && Array.isArray(this.transactionActuelle.boissons)) {
            this.transactionActuelle.boissons.forEach(boisson => {
                const item = document.createElement('div');
                item.className = 'boisson-item';
                item.innerHTML = `
                    <span class="boisson-nom">${boisson.nom}</span>
                    <span class="boisson-prix">${this.formatMontant(boisson.prix)} FCFA</span>
                `;
                listeBoissons.appendChild(item);
            });
        }
        
        // Activer/désactiver le bouton de paiement
        const btnPayer = document.getElementById('btn-payer-transaction');
        btnPayer.disabled = this.transactionActuelle.statut !== 'en_attente';
        
        if (this.transactionActuelle.statut !== 'en_attente') {
            btnPayer.textContent = `Transaction ${this.getStatutText(this.transactionActuelle.statut)}`;
        } else {
            btnPayer.innerHTML = '<i class="fas fa-check-circle"></i> Confirmer le paiement';
        }
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
                this.jouerSon('success');
                this.afficherModalConfirmation('Paiement réussi!', result.message || 'Votre commande sera prête dans 4 secondes.');
                
                // Mettre à jour le solde
                this.userData.solde = result.nouveauSolde;
                this.mettreAJourSolde();
                
                // Recharger l'historique
                this.chargerHistorique();
            } else {
                this.afficherMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Erreur paiement:', error);
            this.afficherMessage('Erreur de connexion au serveur', 'error');
        }
    }
    
    annulerTransaction() {
        this.transactionActuelle = null;
        this.changerOnglet('accueil');
    }
    
    selectionnerOperateur(operateur) {
        this.operateurSelectionne = operateur;
        
        // Mettre à jour l'interface
        document.querySelectorAll('.operateur-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-operateur="${operateur}"]`).classList.add('selected');
        
        this.verifierFormulaireRecharge();
    }
    
    selectionnerMontant(montant) {
        this.montantSelectionne = montant;
        
        // Mettre à jour l'interface
        document.querySelectorAll('.montant-rapide').forEach(m => {
            m.classList.remove('selected');
        });
        document.querySelector(`[data-montant="${montant}"]`).classList.add('selected');
        
        // Mettre à jour le champ personnalisé
        document.getElementById('montant-personnalise').value = montant;
        
        this.verifierFormulaireRecharge();
    }
    
    selectionnerMontantPersonnalise(montant) {
        if (montant && montant > 0) {
            this.montantSelectionne = parseInt(montant);
            
            // Désélectionner les montants rapides
            document.querySelectorAll('.montant-rapide').forEach(m => {
                m.classList.remove('selected');
            });
            
            this.verifierFormulaireRecharge();
        }
    }
    
    verifierFormulaireRecharge() {
        const numero = document.getElementById('numero-recharge').value;
        const btnConfirmer = document.getElementById('btn-confirmer-recharge');
        
        if (this.operateurSelectionne && this.montantSelectionne && numero && numero.length >= 9) {
            btnConfirmer.disabled = false;
        } else {
            btnConfirmer.disabled = true;
        }
    }
    
    async confirmerRecharge() {
        const numero = document.getElementById('numero-recharge').value;
        
        if (!this.operateurSelectionne || !this.montantSelectionne || !numero) {
            this.afficherMessage('Veuillez remplir tous les champs', 'error');
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
                    montant: this.montantSelectionne,
                    operateur: this.operateurSelectionne,
                    numeroTelephone: numero
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.afficherModalConfirmation('Rechargement réussi!', result.message);
                
                // Mettre à jour le solde
                this.userData.solde = result.nouveauSolde;
                this.mettreAJourSolde();
                
                // Réinitialiser le formulaire
                this.reinitialiserFormulaireRecharge();
            } else {
                this.afficherMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Erreur recharge:', error);
            this.afficherMessage('Erreur de connexion au serveur', 'error');
        }
    }
    
    reinitialiserFormulaireRecharge() {
        this.operateurSelectionne = null;
        this.montantSelectionne = null;
        
        document.querySelectorAll('.operateur-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.querySelectorAll('.montant-rapide').forEach(m => {
            m.classList.remove('selected');
        });
        
        document.getElementById('montant-personnalise').value = '';
        document.getElementById('numero-recharge').value = '';
        document.getElementById('btn-confirmer-recharge').disabled = true;
    }
    
    async chargerHistorique() {
        try {
            const response = await fetch(`${this.API_URL}/api/historique`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.afficherHistorique(result.data);
                    this.calculerStats(result.data);
                }
            }
        } catch (error) {
            console.error('Erreur chargement historique:', error);
        }
    }
    
    afficherHistorique(transactions) {
        const liste = document.getElementById('liste-historique');
        const listeRecent = document.getElementById('liste-transactions-recentes');
        
        if (!transactions || transactions.length === 0) {
            liste.innerHTML = '<div class="historique-vide">Aucune transaction trouvée</div>';
            listeRecent.innerHTML = '<div class="transactions-vide">Aucune transaction récente</div>';
            return;
        }
        
        // Historique complet
        liste.innerHTML = transactions.map(transaction => `
            <div class="historique-item">
                <div class="historique-header-item">
                    <span class="historique-id">${transaction.id}</span>
                    <span class="historique-montant">${this.formatMontant(transaction.montant)} FCFA</span>
                </div>
                <div class="historique-date">${new Date(transaction.date).toLocaleString()}</div>
                <div class="historique-statut statut-${transaction.statut}">
                    ${this.getStatutText(transaction.statut)}
                </div>
            </div>
        `).join('');
        
        // Transactions récentes (5 premières)
        const recentes = transactions.slice(0, 5);
        listeRecent.innerHTML = recentes.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-titre">Transaction ${transaction.id}</div>
                    <div class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</div>
                </div>
                <div class="transaction-montant ${transaction.statut === 'paye' ? 'negatif' : ''}">
                    -${this.formatMontant(transaction.montant)} FCFA
                </div>
            </div>
        `).join('');
    }
    
    calculerStats(transactions) {
        const totalTransactions = transactions.length;
        const montantTotal = transactions
            .filter(t => t.statut === 'paye')
            .reduce((sum, t) => sum + t.montant, 0);
        
        document.getElementById('stat-total').textContent = totalTransactions;
        document.getElementById('stat-montant').textContent = this.formatMontant(montantTotal);
    }
    
    filtrerHistorique() {
        // Implémentation basique du filtrage
        this.chargerHistorique();
    }
    
    afficherModalConfirmation(titre, message) {
        document.getElementById('modal-titre').textContent = titre;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-confirmation').classList.add('active');
    }
    
    fermerModal() {
        document.getElementById('modal-confirmation').classList.remove('active');
        this.changerOnglet('accueil');
    }
    
    afficherMessage(message, type = 'info') {
        // Implémentation basique des messages (à améliorer avec un système de notifications)
        console.log(`${type.toUpperCase()}: ${message}`);
        
        if (type === 'error') {
            this.jouerSon('error');
        } else if (type === 'success') {
            this.jouerSon('success');
        }
        
        // Pour l'instant, on utilise alert() mais idéalement il faudrait un système de toast
        alert(message);
    }
    
    jouerSon(type) {
        const audio = document.getElementById(`audio-${type}`);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    }
    
    formatMontant(montant) {
        return new Intl.NumberFormat('fr-FR').format(montant);
    }
    
    getStatutText(statut) {
        const statuts = {
            'en_attente': 'En attente',
            'paye': 'Payée',
            'annule': 'Annulée',
            'expire': 'Expirée'
        };
        return statuts[statut] || statut;
    }
    
    initialiserDateTime() {
        const updateDateTime = () => {
            const now = new Date();
            const dateTimeElement = document.querySelector('.datetime');
            if (dateTimeElement) {
                dateTimeElement.textContent = now.toLocaleString('fr-FR', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        };
        
        updateDateTime();
        setInterval(updateDateTime, 60000); // Mettre à jour chaque minute
    }
    
    togglePassword(btn) {
        const input = btn.closest('.input-group').querySelector('input');
        const icon = btn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }
    
    chargerDonneesInitiales() {
        // Charger les données initiales si l'utilisateur est connecté
        if (this.token) {
            this.chargerSolde();
            this.chargerHistorique();
        }
    }
}

// Initialiser l'application au chargement
document.addEventListener('DOMContentLoaded', function() {
    window.app = new ApplicationUtilisateur();
});