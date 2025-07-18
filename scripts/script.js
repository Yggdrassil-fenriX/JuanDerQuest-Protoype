// Mapbox Access Token (Replace with your actual token)
// You can get one from https://account.mapbox.com/access-tokens/
mapboxgl.accessToken = 'pk.eyJ1IjoiYm9iYnluZDUiLCJhIjoiY2x4b3kzd29iMDRkczJrcW50a2x0cW56aSJ9.J_26n1e6L3n0m7gP_f8T1Q';

// Global state variables - Loaded from localStorage or default values
let tokens = parseInt(localStorage.getItem('juanDerQuestTokens') || '100');
let xp = parseInt(localStorage.getItem('juanDerQuestXp') || '0');
let level = parseInt(localStorage.getItem('juanDerQuestLevel') || '1');
let completedQuests = JSON.parse(localStorage.getItem('juanDerQuestCompletedQuests') || '{}');
let username = localStorage.getItem('juanDerQuestUsername') || '';

let activeView = 'home'; // Default view after successful wallet connection
let isNavOverlayOpen = false;
let showStartPage = true;
let selectedQuestId = null; // New state to store the ID of the selected quest for detail view
let connectedWalletAddress = null; // New state for connected wallet address

// Re-added location-related variables for quest detail page
let userLatitude = null; // User's current latitude
let userLongitude = null; // User's current longitude
let locationCheckStatus = 'idle'; // 'idle', 'checking', 'success', 'denied', 'error'
let isInRange = false; // Whether the user is in range of the selected quest

// Quiz state variables
let currentQuiz = null; // Stores the active quiz object
let currentQuestionIndex = 0;
let quizScore = 0;

// XP thresholds for leveling up
const LEVEL_THRESHOLDS = {
    1: 0, 2: 100, 3: 250, 4: 500, 5: 800, 6: 1200, 7: 1700, 8: 2300, 9: 3000, 10: 4000,
};

// Quest data with approximate coordinates
const quests = [
    { id: 'tondalinis', category: 'Eco Quests', name: 'Tondalinis Cleanup', description: 'Collect 5 types of trash at Tondaligan Beach and upload a flex-worthy cleanup selfie.', location: 'Tondaligan Beach, Dagupan', rewardTokens: 50, rewardXp: 40, badge: 'Coastal Custodian', rating: 4.5, lat: 16.0500, lon: 120.3333 },
    { id: 'patar-patrol', category: 'Eco Quests', name: 'Patar Patrol: Basura Edition', description: 'Sweep Patar Beach clean and restore dune plants. Channel your inner beach ranger.', location: 'Patar Beach, Bolinao', rewardTokens: 60, rewardXp: 50, badge: 'Beach Ranger', rating: 4.8, lat: 16.3262, lon: 119.8279 },
    { id: 'dasol-dustoff', category: 'Eco Quests', name: 'Dasol Dust-Off', description: 'Bring your eco-bag and clean up Tambobong Beach. Bonus if you sort recyclables.', location: 'Tambobong, Dasol', rewardTokens: 55, rewardXp: 45, badge: 'Basura Buster', rating: 4.2, lat: 15.9833, lon: 119.8667 },
    { id: 'tanim-mo-token-ko', category: 'Green Quests', name: 'Tanim Mo, Token Ko!', description: 'Plant a mangrove seedling and make the environment your side hustle.', location: 'Bani Mangrove Eco Park', rewardTokens: 70, rewardXp: 60, badge: 'Mangrove Monarch NFT', rating: 4.9, lat: 16.2778, lon: 119.9500 },
    { id: 'juan-hundred-islands', category: 'Green Quests', name: 'Juan Hundred Islands', description: 'Visit 3 islands at Hundred Islands, complete eco-trivia per stop, and document it.', location: 'Hundred Islands, Alaminos', rewardTokens: 80, rewardXp: 70, badge: 'Island Explorer', rating: 4.7, lat: 16.2000, lon: 120.0000 },
    { id: 'hike-it-till-you-like-it', category: 'Green Quests', name: 'Hike It Till You Like It', description: 'Trek through Manleluag Spring’s forest trails while collecting trash.', location: 'Mangatarem', rewardTokens: 75, rewardXp: 65, badge: 'Trailblazer', rating: 4.3, lat: 15.7833, lon: 120.3500 },
    { id: 'fin-ish-the-quiz', category: 'Culture & Community Quests', name: 'Fin-ish the Quiz', description: 'Attend Bangus Festival and ace the in-app fishy trivia to win tokens.', location: 'Dagupan (During Bangus Festival)', rewardTokens: 40, rewardXp: 30, badge: 'Bangus Buff', rating: 4.0, lat: 16.0333, lon: 120.3333 },
    { id: 'lakbay-lokal', category: 'Culture & Community Quests', name: 'Lakbay Lokal', description: 'Visit 3 heritage sites in one day — GPS will do the checking, you do the JuanDering.', location: 'Lingayen Capitol, Bolinao Church, War Museum', rewardTokens: 90, rewardXp: 80, badge: 'Time Traveler SBT', rating: 4.6, lat: 16.0278, lon: 120.2286 },
    { id: 'juan-scan-away', category: 'Social & Event-Based Quests', name: 'Juan Scan Away', description: 'Join an LGU-organized clean-up or tree planting. Scan, plant, repeat.', location: 'Rotating barangays across Pangasinan (weekends only)', rewardTokens: 100, rewardXp: 90, badge: 'Bayanihan Boss', rating: 4.9, lat: 16.0333, lon: 120.3333 },
    { id: 'juander-together', category: 'Social & Event-Based Quests', name: 'JuanDer Together', description: 'Complete any quest with a friend. Upload a group photo + dual QR scan.', location: 'Anywhere, as long as you quest together', rewardTokens: 120, rewardXp: 100, badge: 'Friendship Flex', rating: 5.0, lat: null, lon: null }, // No specific location for range check
];

// Quiz Data
const quizzes = {
    dagupan: {
        name: "Dagupan City Trivia",
        questions: [
            {
                question: "What is Dagupan City famously known for?",
                options: ["A. Mangoes", "B. Bangus", "C. Tinapa", "D. Adobo"],
                answer: "B. Bangus"
            },
            {
                question: "Which river is a prominent feature of Dagupan City?",
                options: ["A. Pasig River", "B. Dagupan River", "C. Agno River", "D. Bued River"],
                answer: "B. Dagupan River"
            },
            {
                question: "The 'Dagupan City Fiesta' is primarily celebrated in honor of which patron saint?",
                options: ["A. St. John the Baptist", "B. St. Michael the Archangel", "C. St. Therese of Lisieux", "D. St. Gabriel the Archangel"],
                answer: "A. St. John the Baptist"
            },
            {
                question: "What is the traditional fishing method often associated with Dagupan's bangus industry?",
                options: ["A. Trawl fishing", "B. Gill netting", "C. Fish pond culture", "D. Spearfishing"],
                answer: "C. Fish pond culture"
            },
            {
                question: "Dagupan City is located in which province of the Philippines?",
                options: ["A. La Union", "B. Pangasinan", "C. Tarlac", "D. Zambales"],
                answer: "B. Pangasinan"
            }
        ]
    },
    nature: {
        name: "Nature Wonders Quiz",
        questions: [
            {
                question: "What is the process by which plants make their own food?",
                options: ["A. Respiration", "B. Photosynthesis", "C. Transpiration", "D. Germination"],
                answer: "B. Photosynthesis"
            },
            {
                question: "Which gas do plants absorb from the atmosphere?",
                options: ["A. Oxygen", "B. Nitrogen", "C. Carbon Dioxide", "D. Methane"],
                answer: "C. Carbon Dioxide"
            },
            {
                question: "What is the largest ocean on Earth?",
                options: ["A. Atlantic Ocean", "B. Indian Ocean", "C. Arctic Ocean", "D. Pacific Ocean"],
                answer: "D. Pacific Ocean"
            },
            {
                question: "What natural phenomenon is measured by the Richter scale?",
                options: ["A. Tornadoes", "B. Earthquakes", "C. Hurricanes", "D. Volcanic Eruptions"],
                answer: "B. Earthquakes"
            },
            {
                question: "Which of these is a renewable energy source?",
                options: ["A. Coal", "B. Natural Gas", "C. Solar Power", "D. Petroleum"],
                answer: "C. Solar Power"
            }
        ]
    },
    endangered_animals: {
        name: "Endangered Animals Challenge",
        questions: [
            {
                question: "Which of these animals is critically endangered and known for its black and white fur?",
                options: ["A. Polar Bear", "B. Giant Panda", "C. African Elephant", "D. Red Fox"],
                answer: "B. Giant Panda"
            },
            {
                question: "The vaquita, the world's smallest porpoise, is found only in which body of water?",
                options: ["A. Atlantic Ocean", "B. Pacific Ocean", "C. Gulf of California", "D. Mediterranean Sea"],
                answer: "C. Gulf of California"
            },
            {
                question: "Habitat loss is a major threat to endangered species. What is one primary cause of habitat loss?",
                options: ["A. Volcanic eruptions", "B. Deforestation", "C. Ocean currents", "D. Lunar cycles"],
                answer: "B. Deforestation"
            },
            {
                question: "Which large cat is highly endangered due to poaching for its fur and body parts?",
                options: ["A. Lion", "B. Leopard", "C. Tiger", "D. Cheetah"],
                answer: "C. Tiger"
            },
            {
                question: "Conservation efforts often involve creating protected areas. What is a common name for such an area?",
                options: ["A. Zoo", "B. National Park", "C. Farm", "D. City Park"],
                answer: "B. National Park"
            }
        ]
    },
    ocean_life: {
        name: "Ocean Life Quiz",
        questions: [
            {
                question: "What is the largest animal on Earth?",
                options: ["A. Great White Shark", "B. Blue Whale", "C. Giant Squid", "D. Orca"],
                answer: "B. Blue Whale"
            },
            {
                question: "Which marine animal is known for its ability to change color and texture to blend with its surroundings?",
                options: ["A. Dolphin", "B. Seahorse", "C. Octopus", "D. Clownfish"],
                answer: "C. Octopus"
            },
            {
                question: "What is the primary food source for coral polyps?",
                options: ["A. Small fish", "B. Zooplankton", "C. Algae (zooxanthellae)", "D. Seaweed"],
                answer: "C. Algae (zooxanthellae)"
            },
            {
                question: "Which ocean zone receives the most sunlight?",
                options: ["A. Abyssal Zone", "B. Hadal Zone", "C. Sunlight Zone (Epipelagic)", "D. Twilight Zone (Mesopelagic)"],
                answer: "C. Sunlight Zone (Epipelagic)"
            },
            {
                question: "What is the phenomenon where ocean water rises and falls due to gravitational forces?",
                options: ["A. Currents", "B. Waves", "C. Tides", "D. Swells"],
                answer: "C. Tides"
            }
        ]
    },
    forest_ecosystems: {
        name: "Forest Ecosystems Quiz",
        questions: [
            {
                question: "Which type of forest is characterized by trees that shed their leaves annually?",
                options: ["A. Coniferous Forest", "B. Rainforest", "C. Deciduous Forest", "D. Boreal Forest"],
                answer: "C. Deciduous Forest"
            },
            {
                question: "What is the term for the dense canopy formed by the tops of trees in a forest?",
                options: ["A. Understory", "B. Forest Floor", "C. Crown Cover", "D. Shrub Layer"],
                answer: "C. Crown Cover"
            },
            {
                question: "Which organism is a primary producer in a forest ecosystem?",
                options: ["A. Deer", "B. Mushroom", "C. Tree", "D. Wolf"],
                answer: "C. Tree"
            },
            {
                question: "What role do decomposers (like fungi and bacteria) play in a forest?",
                options: ["A. Produce oxygen", "B. Pollinate flowers", "C. Break down dead organic matter", "D. Control pest populations"],
                answer: "C. Break down dead organic matter"
            },
            {
                question: "Which of these is a common threat to forest ecosystems worldwide?",
                options: ["A. Increased rainfall", "B. Reforestation", "C. Illegal logging", "D. Animal migration"],
                answer: "C. Illegal logging"
            }
        ]
    },
    philippine_geography: {
        name: "Philippine Geography Quiz",
        questions: [
            {
                question: "How many islands approximately comprise the Philippines?",
                options: ["A. 1,000", "B. 3,500", "C. 7,641", "D. 10,000"],
                answer: "C. 7,641"
            },
            {
                question: "Which is the largest island in the Philippines?",
                options: ["A. Visayas", "B. Mindanao", "C. Palawan", "D. Luzon"],
                answer: "D. Luzon"
            },
            {
                question: "What is the highest mountain in the Philippines?",
                options: ["A. Mount Pinatubo", "B. Mount Apo", "C. Mount Mayon", "D. Mount Pulag"],
                answer: "B. Mount Apo"
            },
            {
                question: "The Banaue Rice Terraces are located in which province?",
                options: ["A. Benguet", "B. Ifugao", "C. Mountain Province", "D. Kalinga"],
                answer: "B. Ifugao"
            },
            {
                question: "Which body of water borders the Philippines to the east?",
                options: ["A. South China Sea", "B. Sulu Sea", "C. Pacific Ocean", "D. Celebes Sea"],
                answer: "C. Pacific Ocean"
            }
        ]
    },
    marine_conservation: {
        name: "Marine Conservation Quiz",
        questions: [
            {
                question: "What is coral bleaching?",
                options: ["A. Corals changing color for camouflage", "B. Corals expelling algae due to stress", "C. Corals growing faster in sunlight", "D. Corals absorbing more nutrients"],
                answer: "B. Corals expelling algae due to stress"
            },
            {
                question: "Which type of pollution is most harmful to marine life, often leading to entanglement and ingestion?",
                options: ["A. Noise pollution", "B. Light pollution", "C. Plastic pollution", "D. Air pollution"],
                answer: "C. Plastic pollution"
            },
            {
                question: "What is the main purpose of a Marine Protected Area (MPA)?",
                options: ["A. To allow unlimited fishing", "B. To protect marine biodiversity and habitats", "C. To build coastal resorts", "D. To conduct military exercises"],
                answer: "B. To protect marine biodiversity and habitats"
            },
            {
                question: "Overfishing leads to a decline in fish populations. What is a sustainable fishing method?",
                options: ["A. Bottom trawling", "B. Dynamite fishing", "C. Pole and line fishing", "D. Gillnetting"],
                answer: "C. Pole and line fishing"
            },
            {
                question: "Why are mangroves important for coastal ecosystems?",
                options: ["A. They provide open swimming areas", "B. They filter pollutants and provide nurseries for marine life", "C. They attract large predators", "D. They are good for building materials"],
                answer: "B. They filter pollutants and provide nurseries for marine life"
            }
        ]
    }
};

// Map Vote Options
const mapVoteOptions = [
    { id: 'option1', name: 'Tondaligan Beach', imageUrl: 'https://placehold.co/150x150/ADD8E6/000000?text=Option+1', votes: 0 },
    { id: 'option2', name: 'Dagupan City Museum', imageUrl: 'https://placehold.co/150x150/90EE90/000000?text=Option+2', votes: 0 },
    { id: 'option3', name: 'St. John\'s Cathedral', imageUrl: 'https://placehold.co/150x150/FFB6C1/000000?text=Option+3', votes: 0 },
    { id: 'option4', name: 'Dagupe Restaurant', imageUrl: 'https://placehold.co/150x150/FFD700/000000?text=Option+4', votes: 0 },
    { id: 'option5', name: 'Japanese-Philippine Friendship Garden', imageUrl: 'https://placehold.co/150x150/DA70D6/000000?text=Option+5', votes: 0 },
    { id: 'option6', name: 'Dagupan City Plaza', imageUrl: 'https://placehold.co/150x150/87CEEB/000000?text=Option+6', votes: 0 },
];


// Haversine formula to calculate distance between two lat/lon points in kilometers
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

// Function to update level based on XP
function updateLevel() {
    let newLevel = 1;
    for (const lvl in LEVEL_THRESHOLDS) {
        if (xp >= LEVEL_THRESHOLDS[lvl]) {
            newLevel = parseInt(lvl);
        } else {
            break;
        }
    }
    level = newLevel;
    saveAppState(); // Save state after level update
}

// Function to handle quest completion
function handleCompleteQuest(questId) {
    const quest = quests.find(q => q.id === questId);
    if (quest && !completedQuests[questId]) {
        if (quest.lat !== null && quest.lon !== null) { // Only check location if quest has coordinates
            if (isInRange) {
                tokens += quest.rewardTokens;
                xp += quest.rewardXp;
                completedQuests[questId] = true;
                updateLevel(); // Update level after XP changes
                saveAppState(); // Save state after quest completion
                renderApp(); // Re-render the app to reflect changes
                showMessage("Quest Completed!", `Quest "${quest.name}" completed! You earned ${quest.rewardTokens} tokens and ${quest.rewardXp} XP.`);
            } else {
                showMessage("Location Alert", 'You are not close enough to this quest location to complete it!');
            }
        } else { // For quests without specific coordinates (e.g., "JuanDer Together")
            tokens += quest.rewardTokens;
            xp += quest.rewardXp;
            completedQuests[questId] = true;
            updateLevel();
            saveAppState(); // Save state after quest completion
            renderApp();
            showMessage("Quest Completed!", `Quest "${quest.name}" completed! You earned ${quest.rewardTokens} tokens and ${quest.rewardXp} XP.`);
        }
    } else if (completedQuests[questId]) {
        showMessage("Quest Status", 'You have already completed this quest!');
    }
}

// Function to simulate adding tokens
function addTokens(amount, source) {
    tokens += amount;
    saveAppState(); // Save state after token change
    renderApp();
    showMessage("Tokens Gained", `You gained ${amount} tokens via ${source}!`);
}

// Function to simulate token redemption
function redeemTokens(amount) {
    if (tokens >= amount) {
        tokens -= amount;
        saveAppState(); // Save state after token change
        renderApp();
        showMessage("Tokens Redeemed", `You redeemed ${amount} tokens for a discount!`);
    } else {
        showMessage("Insufficient Tokens", 'Not enough tokens to redeem.');
    }
}

// Function to simulate token donation
function donateTokens(amount) {
    if (tokens >= amount) {
        tokens -= amount;
        saveAppState(); // Save state after token change
        renderApp();
        showMessage("Donation Successful", `You donated ${amount} tokens to a heritage site! Thank you for your contribution.`);
    } else {
        showMessage("Insufficient Tokens", 'Not enough tokens to donate.');
    }
}

// Re-added getUserLocation function
function getUserLocation(callback) {
    locationCheckStatus = 'checking';
    renderApp(); // Update UI to show 'checking' status

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLatitude = position.coords.latitude;
                userLongitude = position.coords.longitude;
                locationCheckStatus = 'success';
                if (callback) callback(true);
                renderApp(); // Re-render to show location
            },
            (error) => {
                console.error("Geolocation error:", error);
                userLatitude = null;
                userLongitude = null;
                locationCheckStatus = 'error';
                let errorMessage = "Error getting your location.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location permission denied. Please enable location services for this site.";
                        locationCheckStatus = 'denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "The request to get user location timed out.";
                        break;
                }
                showMessage("Location Error", errorMessage);
                if (callback) callback(false);
                renderApp(); // Re-render to show error/denied status
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        locationCheckStatus = 'error';
        showMessage("Geolocation Not Supported", "Geolocation is not supported by your browser.");
        if (callback) callback(false);
        renderApp(); // Re-render to show error
    }
}

// Quiz Functions
function startQuiz(quizId) {
    currentQuiz = quizzes[quizId];
    currentQuestionIndex = 0;
    quizScore = 0;
    activeView = 'quiz-page';
    renderApp();
}

function submitAnswer(selectedOption) {
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    if (selectedOption === currentQuestion.answer) {
        quizScore++;
    }
    currentQuestionIndex++;
    renderApp(); // Re-render to show next question or results
}

function finishQuiz() {
    const quizRewardTokens = quizScore * 10; // Example: 10 tokens per correct answer
    const quizRewardXp = quizScore * 15; // Example: 15 XP per correct answer
    tokens += quizRewardTokens;
    xp += quizRewardXp;
    updateLevel();
    saveAppState(); // Save state after quiz completion
    showMessage("Quiz Completed!", `Quiz completed! You scored ${quizScore} out of ${currentQuiz.questions.length}.\nYou earned ${quizRewardTokens} tokens and ${quizRewardXp} XP.`);
    activeView = 'home'; // Go back to home after quiz
    currentQuiz = null; // Reset quiz state
    renderApp();
}

// Voting Functions
function handleVote(optionId) {
    const voteCost = 10; // Example cost per vote
    if (tokens >= voteCost) {
        tokens -= voteCost;
        const option = mapVoteOptions.find(opt => opt.id === optionId);
        if (option) {
            option.votes++;
            showMessage("Vote Cast", `You voted for ${option.name}! ${voteCost} tokens deducted.`);
        }
        saveAppState(); // Save state after vote
        renderApp();
    } else {
        showMessage("Insufficient Tokens", 'Not enough tokens to vote!');
    }
}

// Custom Message Box Function
function showMessage(title, message) {
    const msgBox = document.getElementById('message-box');
    const msgBoxTitle = document.getElementById('message-box-title');
    const msgBoxContent = document.getElementById('message-box-content');
    const msgBoxOkButton = document.getElementById('message-box-ok-button');

    if (msgBox && msgBoxTitle && msgBoxContent && msgBoxOkButton) {
        msgBoxTitle.textContent = title;
        msgBoxContent.textContent = message;
        msgBox.classList.remove('hidden');
        msgBoxOkButton.onclick = () => {
            msgBox.classList.add('hidden');
        };
    } else {
        // Fallback to console.log if message box elements are not found
        console.warn("Message box elements not found, falling back to console log:", title, message);
    }
}


// --- View Rendering Functions ---

// Renders the Mobile Navigation Overlay
function renderNavOverlay() {
    const buttonData = [
        { view: 'home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l7 7m-2 2v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6m2-2h6', text: 'Home' },
        { view: 'quests', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', text: 'Quests' },
        { view: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', text: 'Profile' },
        { view: 'wallet', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', text: 'Wallet' },
        { view: 'map-vote', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', text: 'Map Vote' }, // New button for Map Vote
    ];

    return `
        <div id="nav-overlay" class="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 md:hidden
            ${isNavOverlayOpen ? 'opacity-100 pointer-events-auto bg-black bg-opacity-50' : 'opacity-0 pointer-events-none bg-transparent'}">
            <div class="nav-overlay-content grid grid-cols-2 gap-x-4 gap-y-4 p-4">
                ${buttonData.map((button, index) => `
                    <button
                        data-view="${button.view}"
                        class="flex flex-col items-center justify-center w-20 h-20 rounded-full text-white font-bold text-[.7rem]
                        transition-all duration-300 transform shadow-lg
                        ${activeView === button.view ? 'bg-[#985527] scale-110' : 'bg-[#db9d5f]'}"
                        style="opacity: ${isNavOverlayOpen ? 1 : 0}; transform: ${isNavOverlayOpen ? 'scale(1)' : 'scale(0)'}; transition: all 0.3s ease-out ${isNavOverlayOpen ? index * 0.05 : (buttonData.length - 1 - index) * 0.05}s;"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="${button.icon}" />
                        </svg>
                        ${button.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// Renders the Desktop Navbar
function renderDesktopNavbar() {
    return `
        <nav class="hidden md:flex items-center justify-between px-8 py-4 bg-white shadow-md rounded-b-xl z-50 fixed w-full top-0 left-0">
            <div class="flex items-center">
                <img
                    src="./assets/logo.png"
                    alt="JuanDer Quest Logo"
                    class="w-20 h-auto mr-6"
                    onerror="this.onerror=null;this.src='https://via.placeholder.com/100x40/A7F3D0/10B981?text=Logo';"
                />
                <div class="flex space-x-6">
                    <button data-view="home" class="text-gray-600 hover:text-green-700 font-semibold transition-colors duration-200 ${activeView === 'home' ? 'text-green-700 border-b-2 border-green-700' : ''}">Home</button>
                    <button data-view="quests" class="text-gray-600 hover:text-green-700 font-semibold transition-colors duration-200 ${activeView === 'quests' ? 'text-green-700 border-b-2 border-green-700' : ''}">Quests</button>
                    <button data-view="profile" class="text-gray-600 hover:text-green-700 font-semibold transition-colors duration-200 ${activeView === 'profile' ? 'text-green-700 border-b-2 border-green-700' : ''}">Profile</button>
                    <button data-view="wallet" class="text-gray-600 hover:text-green-700 font-semibold transition-colors duration-200 ${activeView === 'wallet' ? 'text-green-700 border-b-2 border-green-700' : ''}">Wallet</button>
                    <button data-view="map-vote" class="text-gray-600 hover:text-green-700 font-semibold transition-colors duration-200 ${activeView === 'map-vote' ? 'text-green-700 border-b-2 border-green-700' : ''}">Map Vote</button>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                
                <button class="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </button>
            </div>
        </nav>
    `;
}

// Renders the Home View (now contains the interactive quest content)
function renderHomeView() {
    // Removed location-related display variables as per user request
    return `
        <div class="p-0 bg-white rounded-xl shadow-lg max-w-4xl mx-auto overflow-hidden">
            <div class="relative w-full h-48 bg-gradient-to-b from-green-400 to-green-600 rounded-b-3xl overflow-hidden flex flex-col justify-end pb-4 px-4 shadow-md">
                <img
                    src="./assets/background.jpg"
                    alt="Mountains background"
                    class="absolute inset-0 w-full h-full object-cover opacity-80"
                    onerror="this.onerror=null;this.src='https://via.placeholder.com/800x300/A7F3D0/10B981?text=Mountains+Fallback';"
                />
                <div class="relative z-10 flex justify-between items-start mb-4">
                    <div class="flex items-center">
                        <img
                            src="./assets/profile-icon.png"
                            alt="User Profile"
                            class="w-12 h-12 rounded-full border-2 border-white shadow-md mr-3"
                            onerror="this.onerror=null;this.src='https://via.placeholder.com/50x50/D1D5DB/FFFFFF?text=User';"
                        />
                        <div>
                            <p class="text-white text-sm font-semibold">Welcome, JuanDerer!</p>
                            <div class="flex items-center space-x-3 mt-1">
                            <span class="text-white text-sm font-semibold flex items-center">
                             
                                <span class="font-bold ml-1"><img src="assets/Token.png" class="w-5 inline"> ${tokens} Tokens</span>
                            </span>
                            <span class="text-white text-sm font-semibold flex items-center">
                                <span class="font-bold ml-1">✨ Level ${level}</span>
                            </span>
                            </div>
                        </div>
                    </div>
                    <button class="p-2 rounded-full bg-white bg-opacity-30 text-white hover:bg-opacity-50 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>
                </div>

                <p class="relative z-10 text-white text-lg font-semibold mb-2">Where do you want to go?</p>
                <div class="relative z-10 flex items-center bg-white rounded-full px-4 py-2 shadow-md">
                    <input
                        type="text"
                        placeholder="Explore now"
                        class="flex-grow bg-transparent outline-none text-gray-700 placeholder-gray-400"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <!-- Removed Mini GPS Section as per user request -->
            <br>
            <!-- Category Icons -->
            <div class="flex justify-around p-4 bg-white shadow-sm -mt-4 relative z-10 rounded-t-xl">
                <div class="flex flex-col items-center text-green-700 font-semibold text-sm">
                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-1 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m8-10h1m-1 4h1m-1 4h1m-10 4h.01M17 17h.01" />
                        </svg>
                    </div>
                    All
                </div>
                <div class="flex flex-col items-center text-gray-600 font-semibold text-sm">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l7 7m-2 2v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6m2-2h6" />
                        </svg>
                    </div>
                    Camping
                </div>
                <div class="flex flex-col items-center text-gray-600 font-semibold text-sm">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                    </div>
                    Heritage
                </div>
                <div class="flex flex-col items-center text-gray-600 font-semibold text-sm">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    Shopping
                </div>
                <div class="flex flex-col items-center text-gray-600 font-semibold text-sm">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-1 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    Adventure
                </div>
            </div>

            <!-- Recommended Section -->
            <div class="p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Recommended Quests</h3>
                    <button id="see-all-quests-button" class="text-green-600 font-semibold text-sm hover:underline">See All</button>
                </div>
                <div class="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
                    ${quests.slice(0, 4).map(quest => `
                        <div class="flex-shrink-0 w-48 bg-gray-50 rounded-lg shadow-md overflow-hidden border border-gray-200 cursor-pointer" data-quest-id="${quest.id}">
                            <div class="w-full h-28 bg-green-200 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-green-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 005-5V7a4 4 0 00-4-4H8a4 4 0 00-4 4v2m0 0l-1 1h10l-1-1m-1 1a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4" />
                                </svg>
                            </div>
                            <div class="p-3">
                                <p class="font-semibold text-gray-800 text-sm mb-1">${quest.name}</p>
                                <p class="text-gray-500 text-xs truncate">${quest.location}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Quizzes Section -->
            <div class="p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Test Your Knowledge!</h3>
                    <button id="see-all-quizzes-button" class="text-green-600 font-semibold text-sm hover:underline">See All</button>
                </div>
                <div class="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
                    ${Object.keys(quizzes).map(quizId => `
                        <div class="flex-shrink-0 w-48 bg-gray-50 rounded-lg shadow-md overflow-hidden border border-gray-200 cursor-pointer quiz-card" data-quiz-id="${quizId}">
                            <div class="w-full h-28 bg-blue-200 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-blue-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <div class="p-3">
                                <p class="font-semibold text-gray-800 text-sm mb-1">${quizzes[quizId].name}</p>
                                <p class="text-gray-500 text-xs">${quizzes[quizId].questions.length} Questions</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Renders the Quizzes List Page
function renderQuizzesListPage() {
    return `
        <div class="p-0 bg-white rounded-xl shadow-lg mt-6 max-w-4xl mx-auto overflow-hidden">
            <div class="relative w-full h-48 bg-gradient-to-b  rounded-b-3xl overflow-hidden flex flex-col justify-end pb-4 px-4 shadow-md">
                <div class="relative z-10 text-center">
                    <img
                        src="./assets/quiz.png"
                        alt="QUIZZES Title Bar"
                        class="mx-auto mb-4"
                        onerror="this.onerror=null;this.src='https://via.placeholder.com/200x50.png?text=QUIZZES';"
                    />
                </div>
            </div>

            <div class="p-4">
                <button id="back-to-home-button" class="mb-4 text-green-600 hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Home
                </button>
                <h3 class="text-xl font-bold text-gray-800 mb-4">Available Quizzes</h3>
                <div class="space-y-4">
                    ${Object.keys(quizzes).map(quizId => `
                        <div class="flex items-center bg-gray-50 rounded-lg shadow-md overflow-hidden border border-gray-200 cursor-pointer p-3 quiz-card" data-quiz-id="${quizId}">
                            <div class="flex-shrink-0 w-20 h-20 bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-blue-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <div class="flex-grow">
                                <p class="font-semibold text-gray-800 text-base mb-1">${quizzes[quizId].name}</p>
                                <p class="text-gray-600 text-sm mb-1">${quizzes[quizId].questions.length} Questions</p>
                            </div>
                            <div class="flex-shrink-0 ml-3">
                                <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm start-quiz-button" data-quiz-id="${quizId}">
                                    Start Quiz
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Renders the Quiz Page
function renderQuizPage() {
    if (!currentQuiz || currentQuestionIndex >= currentQuiz.questions.length) {
        // Quiz finished or not started, show results or go back
        return `
            <div class="p-6 bg-white rounded-xl shadow-lg mt-6 max-w-2xl mx-auto text-center">
                <h2 class="text-3xl font-bold text-green-700 mb-4">Quiz Completed!</h2>
                <p class="text-xl text-gray-700 mb-6">You scored ${quizScore} out of ${currentQuiz ? currentQuiz.questions.length : 0}!</p>
                <button id="back-to-home-from-quiz" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition-transform duration-300 hover:scale-105">
                    Back to Home
                </button>
            </div>
        `;
    }

    const question = currentQuiz.questions[currentQuestionIndex];
    const totalQuestions = currentQuiz.questions.length;

    return `
        <div class="p-6 bg-white rounded-xl shadow-lg mt-6 max-w-2xl mx-auto">
            <h2 class="text-3xl font-bold text-green-700 mb-4 text-center">${currentQuiz.name}</h2>
            <p class="text-gray-600 text-center mb-6">Question ${currentQuestionIndex + 1} of ${totalQuestions}</p>

            <div class="bg-blue-50 p-5 rounded-lg shadow-md border border-blue-200 mb-6">
                <p class="text-xl font-semibold text-blue-800 mb-4">${question.question}</p>
                <div class="space-y-3">
                    ${question.options.map(option => `
                        <button class="w-full text-left bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-3 px-4 rounded-lg transition-colors duration-200 quiz-option" data-option="${option}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="flex justify-between mt-8">
                <button id="prev-question-button"
                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full shadow-md transition-transform duration-300 hover:scale-105
                    ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                    Previous
                </button>
                <button id="next-question-button"
                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition-transform duration-300 hover:scale-105">
                    ${currentQuestionIndex === totalQuestions - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
            </div>
        </div>
    `;
}

// Renders the Quests View (now contains the welcome content)
function renderQuestsView() {
    return `
        <div class="p-0 bg-white rounded-xl shadow-lg mt-6 max-w-4xl mx-auto overflow-hidden">
            <div class="relative w-full h-48 bg-gradient-to-b from-green-400 to-emerald-600 rounded-b-3xl overflow-hidden flex flex-col justify-end pb-4 px-4 shadow-md">
                <img
                    src="./assets/background.jpg"
                    alt="Quests background"
                    class="absolute inset-0 w-full h-full object-cover opacity-80"
                    onerror="this.onerror=null;this.src='https://via.placeholder.com/800x300/A7F3D0/10B981?text=Quests+Fallback';"
                />
                <div class="relative z-10 text-center">
                    <img
                        src="assets/questsLogo.png"
                        alt="QUESTS Title Bar"
                        class="mx-auto mb-4"
                        onerror="this.onerror=null;this.src='https://via.placeholder.com/200x50.png?text=QUESTS';"
                    />
                </div>
            </div>

            <div class="p-4">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Available Quests</h3>
                <div class="space-y-4">
                    ${quests.map(quest => `
                        <div class="flex items-center bg-gray-50 rounded-lg shadow-md overflow-hidden border border-gray-200 cursor-pointer p-3" data-quest-id="${quest.id}">
                            <div class="flex-shrink-0 w-20 h-20 bg-green-200 rounded-lg flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 005-5V7a4 4 0 00-4-4H8a4 4 0 00-4 4v2m0 0l-1 1h10l-1-1m-1 1a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4m-4-4a2 2 0 100 4" />
                                </svg>
                            </div>
                            <div class="flex-grow">
                                <p class="font-semibold text-gray-800 text-base mb-1">${quest.name}</p>
                                <p class="text-gray-600 text-sm mb-1 line-clamp-2">${quest.description}</p>
                                <p class="text-gray-500 text-xs flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    ${quest.location}
                                </p>
                            </div>
                            <div class="flex-shrink-0 ml-3 text-right">
                                <div class="flex items-center justify-end text-green-600 font-bold text-sm">
                                    ${quest.rewardTokens}
                                    <img src="./assets/Token.png" class="w-5">
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Renders the Profile View
function renderProfileView() {
    const nextLevelXpThreshold = LEVEL_THRESHOLDS[level + 1] || xp;
    const progressToNextLevel = level < 10 ? Math.max(0, xp - LEVEL_THRESHOLDS[level]) : 0;
    const totalXpForCurrentLevel = LEVEL_THRESHOLDS[level];
    const totalXpNeededForNextLevel = level < 10 ? (nextLevelXpThreshold - totalXpForCurrentLevel) : 0;
    const progressPercentage = totalXpNeededForNextLevel > 0 ? (progressToNextLevel / totalXpNeededForNextLevel) * 100 : 100;

    const earnedBadges = Array.from(new Set(
        Object.keys(completedQuests)
            .filter(id => completedQuests[id])
            .map(id => quests.find(q => q.id === id)?.badge)
            .filter(Boolean)
    ));

    return `
        <div class="relative w-full max-w-sm bg-white backdrop-blur-md rounded-3xl shadow-xl text-white overflow-hidden pb-5">
            <div class="flex justify-between items-center p-4 relative z-10">
                <i class="fas fa-arrow-left text-2xl"></i>
                <i class="fas fa-bell text-2xl"></i>
            </div>

            <div class="flex flex-col items-center px-5 relative z-0 -mt-8 pb-0">
                <img src="./assets/profile-icon.png" alt="Profile Picture" class="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg">
                <div class="text-center mt-4 w-full">
                    <div class="inline-flex items-center justify-center bg-[#f8ecd2] p-2 pl-4 pr-3 rounded-full shadow-md">
                        <span class="bg-[#f8ecd2] text-[#985527] px-3 py-1 rounded-full text-lg font-bold mr-3 shadow-sm">Juan D.</span>
                        <span class="text-yellow-400 text-xl font-bold">12,345</span>
                        <img src="./assets/Token.png" alt="" class="w-8">
                    </div>
                </div>
            </div>

            <div class="bg-amber-100 border-4 border-amber-800 rounded-xl m-5 p-5 shadow-lg relative pt-10">
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-2xl font-bold px-6 py-2 rounded-xl shadow-md border-2 border-amber-950 whitespace-nowrap">
                    Badges Earned
                </div>
                <div class="grid grid-cols-3 gap-4 mt-4">
                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-blue-500 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-blue-600">
                            <img src="./assets/baewatcher.png" alt="Baewatcher Badge" class="w-16 h-16 object-contain drop-shadow">
                        </div>
                        <span class="text-[.6rem] font-semibold text-gray-800">BaeWatcher</span>
                    </div>
                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-green-500 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-green-600">
                            <img src="./assets/gubatron.png" alt="GubaTron Badge" class="w-16 h-16 object-contain drop-shadow">
                        </div>
                        <span class="text-[.6rem] font-semibold text-gray-800">GubaTron</span>
                    </div>
                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-red-500 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-red-600">
                            <img src="./assets/juanderfull.png" alt="JuanDerFull Badge" class="w-16 h-16 object-contain drop-shadow">
                        </div>
                        <span class="text-[.6rem] font-semibold text-gray-800">JuanDerFull</span>
                    </div>

                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-gray-400 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-gray-500">
                            <i class="fas fa-lock text-3xl text-gray-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-gray-800"></span>
                    </div>
                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-gray-400 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-gray-500">
                            <i class="fas fa-lock text-3xl text-gray-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-gray-800"></span>
                    </div>
                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-gray-400 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-gray-500">
                            <i class="fas fa-lock text-3xl text-gray-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-gray-800"></span>
                    </div>

                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-gray-400 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-gray-500">
                            <i class="fas fa-lock text-3xl text-gray-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-gray-800"></span>
                    </div>
                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-gray-400 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-gray-500">
                            <i class="fas fa-lock text-3xl text-gray-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-gray-800"></span>
                    </div>
                    <div class="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div class="w-20 h-24 bg-gray-400 rounded shield-shape flex justify-center items-center mb-1 shadow-inner border border-gray-500">
                            <i class="fas fa-lock text-3xl text-gray-600"></i>
                        </div>
                        <span class="text-sm font-semibold text-gray-800"></span>
                    </div>
                </div>
            </div>
        </div>  
    `;
}

// Renders the new Wallet Page
function renderWalletView() {
    const truncatedAddress = connectedWalletAddress ? `${connectedWalletAddress.substring(0, 10)}...${connectedWalletAddress.substring(connectedWalletAddress.length - 10)}` : 'N/A';
    return `
        <div class="p-0 bg-[#985527] rounded-xl shadow-lg mt-6 max-w-xl mx-auto overflow-hidden text-center">
            <div class="relative w-full h-48 bg-cover bg-center flex  justify-between items-center py-10" style="background-image: url('https://via.placeholder.com/400x200/FDBA74/FFFFFF?text=Wallet+Header');">
                
                <p class="text-lg text-center mx-auto text-white ">
                    <img
                        src="assets/mywallet.png"
                        alt="QUESTS Title Bar"
                        class="mx-auto w-8/12"
                        onerror="this.onerror=null;this.src='https://via.placeholder.com/200x50.png?text=QUESTS';"
                    />
                    ${truncatedAddress}
                </p>
                <br><br>
            </div>

            <div class="p-6 bg-white rounded-b-xl shadow-lg">
                <div class="bg-amber-100 p-2 rounded-lg shadow-inner border border-amber-200 mb-6 relative -mt-16 z-20">
                    
                    <p class="text-4xl font-bold text-amber-800 flex items-center justify-center">                        
                        ${tokens} <span class="ml-2 text-3xl"><img src="./assets/Token.png" class="w-10"></span>
                    </p>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <button id="donate-tokens-button" class="flex flex-col items-center p-2 bg-emerald-50 rounded-lg shadow-md hover:bg-emerald-100 transition-colors">
                        <i class="fa-solid fa-hand-holding-dollar text-xl text-emerald-600"></i>
                        <span class="text-xs font-semibold text-gray-700">Donate</span>
                    </button>
                    <button id="redeem-tokens-button" class="flex flex-col items-center p-2 bg-emerald-50 rounded-lg shadow-md hover:bg-emerald-100 transition-colors">
                        <i class="fa-solid fa-money-check-dollar text-xl text-emerald-600"></i>

                        <span class="text-xs font-semibold text-gray-700">Redeem</span>
                    </button>
                    <button id="top-up-tokens-button" class="flex flex-col items-center p-2 bg-emerald-50 rounded-lg shadow-md hover:bg-emerald-100 transition-colors">
                        <i class="fa-solid fa-coins text-xl text-emerald-600"></i>
                        <span class="text-xs font-semibold text-gray-700">Top Up</span>
                    </button>
                    <button id="earn-tokens-button" class="flex flex-col items-center p-2 bg-emerald-50 rounded-lg shadow-md hover:bg-emerald-100 transition-colors">
                        <i class="fa-solid fa-gem text-xl text-emerald-600"></i>

                        <span class="text-xs font-semibold text-gray-700">Earn</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}


// Renders the dedicated Quest Detail Page
function renderQuestDetailPage() {
    const quest = quests.find(q => q.id === selectedQuestId);
    if (!quest) {
        return `<div class="p-6 text-center text-red-500">Quest not found!</div>`;
    }

    const isCompleted = completedQuests[quest.id];
    const hasLocation = quest.lat !== null && quest.lon !== null; // Re-introduced hasLocation

    let locationStatusHtml = '';
    if (hasLocation) {
        let statusMessage = '';
        let statusColor = 'text-gray-600';
        let checkButtonDisabled = false;

        switch (locationCheckStatus) {
            case 'idle':
                statusMessage = 'Click "Check Location" to verify your proximity.';
                break;
            case 'checking':
                statusMessage = 'Checking your location...';
                statusColor = 'text-blue-500';
                checkButtonDisabled = true;
                break;
            case 'success':
                const distance = haversineDistance(userLatitude, userLongitude, quest.lat, quest.lon);
                const rangeThreshold = 0.5; // km (500 meters)
                isInRange = distance <= rangeThreshold;
                statusMessage = isInRange ?
                    `<span class="font-bold">You are within ${distance.toFixed(2)} km of the quest!</span>` :
                    `<span class="font-bold">You are ${distance.toFixed(2)} km away.</span> (Need to be within ${rangeThreshold} km)`;
                statusColor = isInRange ? 'text-green-600' : 'text-red-500';
                break;
            case 'denied':
                statusMessage = 'Location access denied. Please enable location services in your browser settings.';
                statusColor = 'text-red-500';
                break;
            case 'error':
                statusMessage = 'Could not get your location. Please try again.';
                statusColor = 'text-red-500';
                break;
        }

        locationStatusHtml = `
            <div class="bg-blue-50 p-4 rounded-lg shadow-inner border border-blue-200 mb-6">
                <h3 class="text-lg font-semibold text-blue-800 mb-2">Location Verification</h3>
                <p class="text-sm ${statusColor} mb-3">${statusMessage}</p>
                <button id="check-location-button"
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full text-sm shadow-md transition-transform duration-300 hover:scale-105
                        ${checkButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${checkButtonDisabled ? 'disabled' : ''}>
                    ${locationCheckStatus === 'checking' ? 'Locating...' : 'Check My Location'}
                </button>
                ${userLatitude && userLongitude ? `
                    <p class="text-xs text-gray-500 mt-2">Your location: Lat ${userLatitude.toFixed(4)}, Lon ${userLongitude.toFixed(4)}</p>
                ` : ''}
                <p class="text-xs text-gray-500 mt-1">Quest location: Lat ${quest.lat}, Lon ${quest.lon}</p>
            </div>
        `;
    } else {
        locationStatusHtml = `
            <div class="bg-gray-50 p-4 rounded-lg shadow-inner border border-gray-200 mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Location Information</h3>
                <p class="text-sm text-gray-600">This quest does not require location verification.</p>
            </div>
        `;
        isInRange = true; // Automatically true for quests without location
    }


    return `
        <div class="p-6 bg-white rounded-xl shadow-lg mt-6 max-w-4xl mx-auto">
            <button id="back-to-home-button" class="mb-4 text-green-600 hover:underline flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
            </button>
            <h2 class="text-3xl font-bold text-green-700 mb-4 text-center">${quest.name}</h2>
            <p class="text-gray-600 text-center mb-6">${quest.category} - ${quest.location}</p>

            <div class="bg-emerald-50 p-5 rounded-lg shadow-md border border-emerald-200 mb-6">
                <h3 class="text-xl font-semibold text-emerald-800 mb-3">Details</h3>
                <p class="text-gray-700 mb-2">${quest.description}</p>
                <p class="text-gray-700 mb-2"><strong>Reward:</strong> <img src="assets/Token.png" class="inline w-5"> ${quest.rewardTokens} Tokens, ✨ ${quest.rewardXp} XP</p>
                <p class="text-gray-700 mb-2"><strong>Badge:</strong> ${quest.badge}</p>
            </div>

            ${locationStatusHtml}

            ${isCompleted ? `
                <p class="text-center text-green-600 font-bold text-xl mt-8">Quest Completed!</p>
            ` : `
                <button id="complete-quest-button" data-quest-id="${quest.id}"
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition-transform duration-300 hover:scale-105
                    ${!isInRange && hasLocation ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${!isInRange && hasLocation ? 'disabled' : ''}>
                    Complete Quest
                </button>
            `}
        </div>
    `;
}

// Renders the Map Vote Page
function renderMapVoteView() {
    return `
        <div class="relative min-h-screen flex flex-col items-center pt-24 pb-8">
            <div class="relative z-10 flex flex-col items-center w-full max-w-md mx-auto px-4">
                <img src="./assets/mapvote.png" class="">

                <div class="bg-white rounded-xl shadow-lg p-6 w-full text-center mb-8">
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">JuanDerers decide!</h3>
                    <p class="text-gray-700 text-lg mb-6">Vote for the destination that wowed you most!</p>

                    <div class="grid grid-cols-2 gap-4">
                        ${mapVoteOptions.map(option => `
                            <div class="flex flex-col items-center bg-gray-50 rounded-lg shadow-md overflow-hidden border border-gray-200 p-3">
                                <img
                                    src="${option.imageUrl}"
                                    alt="${option.name}"
                                    class="w-full h-24 object-cover rounded-md mb-3"
                                    onerror="this.onerror=null;this.src='https://placehold.co/150x150/E0E0E0/333333?text=Image';"
                                />
                                <p class="font-semibold text-gray-800 text-sm mb-2">${option.name}</p>
                                <button data-option-id="${option.id}"
                                        class="vote-button w-full bg-[#985527] hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition-transform duration-300 hover:scale-105">
                                    VOTE
                                </button>
                                <p class="text-xs text-gray-500 mt-1">Votes: ${option.votes}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}


// Renders the Start Page
function renderStartPage() {
    return `
        <div id="start-page" class="fixed bg-cover inset-0 bg-gradient-to-br from-green-500 to-emerald-700 flex flex-col items-center justify-center z-[100] text-white p-4 text-center" style="background-image: url('./assets/start-page.png');">
            <img
                src="./assets/logo.png"
                alt="JuanDer Quest Logo"
                class="w-full max-w-xl mb-8 animate-fade-in-up rounded-lg shadow-lg"
                onerror="this.onerror=null;this.src='https://via.placeholder.com/600x100.png?text=JuanDer+Quest+Logo+Fallback';"
            />
            ${isAnimatingLoading ? `
                <div class="flex flex-col items-center">
                    <p class="text-xl font-semibold mb-4">Preparing your adventure...</p>
                    <div class="progress-bar-container w-64 h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div class="progress-bar-fill h-full rounded-full bg-gradient-to-r from-lime-400 to-green-600"></div>
                    </div>
                </div>
            ` : `
                <button
                    id="start-adventure-button"
                    class="
                    transform transition-all background-transparent duration-300 animate-pop-in
                    flex items-center justify-center space-x-3 relative"
                >
                    <img src="./assets/startbutton.png" class="w-8/12">
                </button>
            `}
        </div>
    `;
}

// Renders the Connect Wallet View
function renderConnectWalletView() {
    return `
        <div class="p-6 bg-white rounded-xl shadow-lg mt-6 max-w-md mx-auto text-center">
            <h2 class="text-3xl font-bold text-green-700 mb-6">Connect Your Wallet</h2>
            <p class="text-gray-700 mb-6">
                To access JuanDer Quest, please connect your MetaMask wallet and provide a username.
            </p>

            <div class="mb-6">
                <label for="username-input" class="block text-left text-gray-700 text-sm font-bold mb-2">Username:</label>
                <input type="text" id="username-input" placeholder="Enter your username" value="${username}"
                        class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500">
            </div>

            <button id="connect-wallet-button"
                    class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition-transform duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask icon" class="h-6 w-6">
                <span>Connect MetaMask Wallet</span>
            </button>
            <p id="wallet-status" class="mt-4 text-sm text-gray-600">
                ${connectedWalletAddress ? `Connected: ${connectedWalletAddress.substring(0, 6)}...${connectedWalletAddress.substring(connectedWalletAddress.length - 4)}` : 'Wallet not connected.'}
            </p>
        </div>
    `;
}

// --- Main Application Rendering ---

let isAnimatingLoading = false; // Local state for StartPage animation

function renderApp() {
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    let mainContentHtml = '';
    let headerHtml = '';
    let mainPaddingClass = 'pt-4 md:pt-6'; // Consistent padding for all main content areas

    // If not showing start page and wallet is not connected OR username is missing, force connect-wallet view
    if (!showStartPage && (!connectedWalletAddress || !username) && activeView !== 'connect-wallet') {
        activeView = 'connect-wallet';
    }

    // Always render desktop navbar if not on connect-wallet page (visibility controlled by CSS)
    if (activeView !== 'connect-wallet') {
        headerHtml = renderDesktopNavbar();
        mainPaddingClass = 'pt-24'; // Adjust padding for fixed desktop navbar
    }


    switch (activeView) {
        case 'connect-wallet':
            mainContentHtml = renderConnectWalletView();
            break;
        case 'home':
            mainContentHtml = renderHomeView();
            break;
        case 'quests':
            mainContentHtml = renderQuestsView();
            break;
        case 'profile':
            mainContentHtml = renderProfileView();
            break;
        case 'wallet': // Changed from 'token-utility' to 'wallet'
            mainContentHtml = renderWalletView();
            break;
        case 'quest-detail':
            mainContentHtml = renderQuestDetailPage();
            break;
        case 'quizzes-list':
            mainContentHtml = renderQuizzesListPage();
            break;
        case 'quiz-page':
            mainContentHtml = renderQuizPage();
            break;
        case 'map-vote': // New case for Map Vote page
            mainContentHtml = renderMapVoteView();
            break;
        default:
            // Fallback to connect-wallet if something goes wrong and wallet isn't connected
            mainContentHtml = renderConnectWalletView();
    }

    // Mobile nav toggle and overlay are now always rendered, but hidden on desktop via CSS
    const mobileNavToggleHtml = `
        <button id="mobile-nav-toggle" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-3 px-6 rounded-full shadow-xl transform transition-transform duration-300 hover:scale-105 z-[99] flex items-center justify-center w-16 h-16 fixed bottom-10 left-0 right-0 sm:hidden">
            <img src="./assets/NavButton.png" class="absolute">
        </button>
        ${renderNavOverlay()}
    `;

    if (showStartPage) {
        appRoot.innerHTML = renderStartPage();
        const startButton = document.getElementById('start-adventure-button');
        if (startButton) {
            startButton.onclick = () => {
                isAnimatingLoading = true;
                renderApp();
                setTimeout(() => {
                    showStartPage = false;
                    activeView = connectedWalletAddress && username ? 'home' : 'connect-wallet';
                    isAnimatingLoading = false;
                    renderApp();
                }, 2000);
            };
        }
    } else {
        appRoot.innerHTML = `
            ${headerHtml}
            <main class="container mx-auto px-4 flex-grow pb-20 md:pb-8 ${mainPaddingClass}" style="background-image: url('./assets/background.jpg')">
                ${mainContentHtml}
            </main>
            ${mobileNavToggleHtml}
        `;
        attachEventListeners();
    }
}

// Function to attempt wallet connection
async function attemptWalletConnection() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                connectedWalletAddress = accounts[0];
                // If username is already set (from localStorage or input), go to home
                if (username) {
                    activeView = 'home';
                } else {
                    // If no username, stay on connect-wallet to prompt for it
                    activeView = 'connect-wallet';
                }
                console.log(`Wallet connected: ${connectedWalletAddress}`);
            } else {
                connectedWalletAddress = null;
                activeView = 'connect-wallet'; // No accounts, force connect wallet view
                console.log("No accounts found.");
            }
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
            connectedWalletAddress = null;
            activeView = 'connect-wallet'; // Error in connection, force connect wallet view
            showMessage("Connection Failed", "Failed to connect wallet. Please ensure MetaMask is unlocked and try again.");
        }
    } else {
        connectedWalletAddress = null;
        activeView = 'connect-wallet'; // MetaMask not detected, force connect wallet view
        console.log("MetaMask not detected.");
    }
    renderApp();
}

function attachEventListeners() {
    // Mobile Nav Toggle Button (now primary navigation) - only attach if it exists
    const mobileNavToggleButton = document.getElementById('mobile-nav-toggle');
    if (mobileNavToggleButton) {
        mobileNavToggleButton.onclick = () => {
            isNavOverlayOpen = !isNavOverlayOpen;
            renderApp();
        };
    }

    // Mobile Nav Overlay buttons
    const navOverlay = document.getElementById('nav-overlay');
    if (navOverlay) {
        navOverlay.onclick = (event) => {
            if (event.target.id === 'nav-overlay') {
                isNavOverlayOpen = false;
                renderApp();
            }
        };
        navOverlay.querySelectorAll('.nav-overlay-content button').forEach(button => {
            button.onclick = (event) => {
                activeView = event.currentTarget.dataset.view;
                isNavOverlayOpen = false;
                renderApp();
            };
        });
    }

    // Desktop Navbar buttons
    document.querySelectorAll('nav.hidden.md\\:flex button[data-view]').forEach(button => {
        button.onclick = (event) => {
            activeView = event.currentTarget.dataset.view;
            renderApp();
        };
    });

    // Function to redirect to MetaMask app or store
    function redirectToMetaMaskAppOrStore() {
        const appStoreUrl = 'https://apps.apple.com/us/app/metamask/id1438144202';
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=io.metamask';
        const currentUrl = encodeURIComponent(window.location.href); // Get current URL to return to

        // Try to open the app via deep link with a return URL
        // Note: The exact 'returnUrl' parameter name and behavior can vary by app.
        // 'dapp' is a common parameter for MetaMask deep links.
        const deepLink = `metamask://dapp/${currentUrl}`;
        window.location.href = deepLink;

        // Set a timeout to redirect to the store if the app doesn't open
        setTimeout(() => {
            if (/android/i.test(navigator.userAgent)) {
                window.location.href = playStoreUrl;
            } else if (/ipad|iphone|ipod/i.test(navigator.userAgent)) {
                window.location.href = appStoreUrl;
            } else {
                // Fallback for desktop if MetaMask is not installed
                showMessage("MetaMask Not Installed", "MetaMask is not installed. Please install the MetaMask extension for your browser.");
            }
        }, 1000); // 1 second delay to allow deep link to work
    }

    // Connect Wallet button (now the primary entry point)
    const connectWalletButton = document.getElementById('connect-wallet-button');
    if (connectWalletButton) {
        connectWalletButton.onclick = async () => {
            const usernameInput = document.getElementById('username-input');
            if (!usernameInput || !usernameInput.value.trim()) {
                showMessage("Username Required", "Please enter a username to proceed.");
                return;
            }
            username = usernameInput.value.trim(); // Store the username
            localStorage.setItem('juanDerQuestUsername', username); // Save username to localStorage

            if (window.ethereum) {
                await attemptWalletConnection(); // Attempt connection directly
            } else {
                // MetaMask not installed, try to open app or redirect to store
                redirectToMetaMaskAppOrStore();
            }
        };
    }

    // Listen for accounts changes from MetaMask
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                connectedWalletAddress = accounts[0];
                console.log("MetaMask account changed to:", connectedWalletAddress);
            } else {
                connectedWalletAddress = null;
                console.log("MetaMask disconnected or no accounts available.");
            }
            renderApp(); // Re-render to reflect new wallet status
        });

        // Listen for chain changes from MetaMask
        window.ethereum.on('chainChanged', (chainId) => {
            console.log("MetaMask chain changed to:", chainId);
            // You might want to prompt the user to switch networks or handle it
            renderApp(); // Re-render if chain change affects UI
        });
    }

    // Add a window focus listener to re-check wallet connection when user returns to the tab
    window.addEventListener('focus', async () => {
        // If wallet is not connected and we are not on the start page, try to connect
        if (!connectedWalletAddress && !showStartPage) {
            console.log("Window focused, attempting to reconnect wallet...");
            await attemptWalletConnection();
        }
    });


    // Quest card click handler in Home View and Quests View
    document.querySelectorAll('[data-quest-id]').forEach(card => {
        card.onclick = (event) => {
            selectedQuestId = event.currentTarget.dataset.questId;
            activeView = 'quest-detail';
            // Re-added locationCheckStatus and isInRange reset for quest detail page
            locationCheckStatus = 'idle';
            isInRange = false;
            renderApp();
        };
    });

    // Back to Home button on Quest Detail Page and Quizzes List Page
    const backToHomeButton = document.getElementById('back-to-home-button');
    if (backToHomeButton) {
        backToHomeButton.onclick = () => {
            activeView = 'home';
            selectedQuestId = null; // Clear selected quest
            currentQuiz = null; // Clear current quiz
            renderApp();
        };
    }

    // Back to Home button on Wallet Page
    const backToHomeButtonWallet = document.getElementById('back-to-home-button-wallet');
    if (backToHomeButtonWallet) {
        backToHomeButtonWallet.onclick = () => {
            activeView = 'home';
            renderApp();
        };
    }

    // Complete Quest button on Quest Detail Page
    const completeQuestButton = document.getElementById('complete-quest-button');
    if (completeQuestButton) {
        completeQuestButton.onclick = (event) => {
            const questId = event.currentTarget.dataset.questId;
            handleCompleteQuest(questId);
        };
    }

    // Re-added Check Location button handler for Quest Detail Page
    const checkLocationButton = document.getElementById('check-location-button');
    if (checkLocationButton) {
        checkLocationButton.onclick = () => {
            getUserLocation(() => {
                // Callback to re-render after location check is complete
                renderApp();
            });
        };
    }

    // "See All" button on Home Page for Quests
    const seeAllQuestsButton = document.getElementById('see-all-quests-button');
    if (seeAllQuestsButton) {
        seeAllQuestsButton.onclick = () => {
            activeView = 'quests';
            renderApp();
        };
    }

    // "See All" button on Home Page for Quizzes
    const seeAllQuizzesButton = document.getElementById('see-all-quizzes-button');
    if (seeAllQuizzesButton) {
        seeAllQuizzesButton.onclick = () => {
            activeView = 'quizzes-list';
            renderApp();
        };
    }

    // Quiz card click handler in Home View and Quizzes List Page
    document.querySelectorAll('.quiz-card').forEach(card => {
        card.onclick = (event) => {
            const quizId = event.currentTarget.dataset.quizId;
            startQuiz(quizId);
        };
    });

    // Quiz option click handler
    document.querySelectorAll('.quiz-option').forEach(optionButton => {
        optionButton.onclick = (event) => {
            submitAnswer(event.currentTarget.dataset.option);
        };
    });

    // Next/Finish Quiz button
    const nextQuestionButton = document.getElementById('next-question-button');
    if (nextQuestionButton) {
        nextQuestionButton.onclick = () => {
            if (currentQuestionIndex === currentQuiz.questions.length) {
                finishQuiz();
            } else {
                // This button is primarily for moving to the next question after an answer is selected.
                // However, the current implementation automatically moves to the next question
                // or finishes the quiz upon `submitAnswer`.
                // For a more robust quiz, we'd need to track if an answer was selected for the current question
                // before allowing "Next". For now, this button acts as a "Finish Quiz" if on the last question.
                // If it's not the last question, and an answer hasn't been selected, it should ideally do nothing
                // or prompt the user to select an answer.
                // For simplicity, if we are on the last question and this button is clicked, it finishes.
                // Otherwise, it implicitly relies on `submitAnswer` to advance.
                // To make it functional for 'Next Question' without selecting an answer, we'd need more state.
                // Given the current structure, the options themselves call `submitAnswer`.
                // So, this button primarily serves as 'Finish Quiz' on the last question.
                finishQuiz(); // If somehow we get here on the last question without an option click.
            }
        };
    }

    // Previous Question button
    const prevQuestionButton = document.getElementById('prev-question-button');
    if (prevQuestionButton) {
        prevQuestionButton.onclick = () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderApp();
            }
        };
    }

    // Back to Home from Quiz button (after quiz completion)
    const backToHomeFromQuizButton = document.getElementById('back-to-home-from-quiz');
    if (backToHomeFromQuizButton) {
        backToHomeFromQuizButton.onclick = () => {
            activeView = 'home';
            currentQuiz = null;
            renderApp();
        };
    }


    // Wallet buttons (previously Token Utility buttons)
    const donateTokensButton = document.getElementById('donate-tokens-button');
    if (donateTokensButton) donateTokensButton.onclick = () => donateTokens(20);

    const redeemTokensButton = document.getElementById('redeem-tokens-button');
    if (redeemTokensButton) redeemTokensButton.onclick = () => redeemTokens(50);

    const topUpTokensButton = document.getElementById('top-up-tokens-button');
    if (topUpTokensButton) topUpTokensButton.onclick = () => addTokens(100, 'Top-up');

    const earnTokensButton = document.getElementById('earn-tokens-button');
    if (earnTokensButton) earnTokensButton.onclick = () => addTokens(tokens, 'Watching Ad');

    // Map Vote button handlers
    document.querySelectorAll('.vote-button').forEach(button => {
        button.onclick = (event) => {
            const optionId = event.currentTarget.dataset.optionId;
            handleVote(optionId);
        };
    });
}

// Initial render when the window loads
window.onload = async () => {
    await attemptWalletConnection(); // Attempt connection on initial load
    renderApp();
};