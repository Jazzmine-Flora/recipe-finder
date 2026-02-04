// Import Supabase auth functions
import { signUp, signIn, logout, onAuthChange } from './auth';
import { supabase } from './supabase';

// Step 1: Select HTML elements from the DOM
// We use 'as' to tell TypeScript what type each element is
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchButton = document.getElementById('search-button') as HTMLButtonElement;
const recipesContainer = document.getElementById('recipes-container') as HTMLDivElement;
const modal = document.getElementById('recipe-modal') as HTMLDivElement;
const modalBody = document.getElementById('modal-body') as HTMLDivElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;
const viewFavoritesBtn = document.getElementById('view-favorites-btn') as HTMLButtonElement;
const favoritesCount = document.getElementById('favorites-count') as HTMLSpanElement;
const sectionTitle = document.getElementById('section-title') as HTMLHeadingElement;
const viewTrendingBtn = document.getElementById('view-trending-btn') as HTMLButtonElement;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;

// Filter elements
const filterVegetarian = document.getElementById('filter-vegetarian') as HTMLInputElement;
const filterVegan = document.getElementById('filter-vegan') as HTMLInputElement;
const filterGlutenFree = document.getElementById('filter-gluten-free') as HTMLInputElement;
const filterDairyFree = document.getElementById('filter-dairy-free') as HTMLInputElement;
const filterCuisine = document.getElementById('filter-cuisine') as HTMLSelectElement;

// Auth elements
const authButtons = document.getElementById('auth-buttons') as HTMLDivElement;
const userInfo = document.getElementById('user-info') as HTMLDivElement;
const userEmail = document.getElementById('user-email') as HTMLSpanElement;
const signupBtn = document.getElementById('signup-btn') as HTMLButtonElement;
const signinBtn = document.getElementById('signin-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const authModal = document.getElementById('auth-modal') as HTMLDivElement;
const authFormContainer = document.getElementById('auth-form-container') as HTMLDivElement;
const authModalClose = document.getElementById('auth-modal-close') as HTMLButtonElement;

// Track current view and user
let currentView: 'search' | 'favorites' | 'trending' = 'search';
let lastSearchResults: any[] = []; // Store last search results
let currentUser: any = null;

// Track current user auth state
onAuthChange((user) => {
  currentUser = user;
  updateAuthUI();
});

// Initialize theme from localStorage
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;

  document.body.classList.toggle('dark-mode', shouldUseDark);
  document.documentElement.classList.toggle('dark-mode', shouldUseDark);
  document.body.classList.remove('light-mode');
  themeToggle.textContent = shouldUseDark ? '☀️' : '🌙';
}

// Initialize theme on page load
initializeTheme();

// Theme toggle button
themeToggle.addEventListener('click', () => {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  document.documentElement.classList.toggle('dark-mode', isDarkMode);
  document.body.classList.remove('light-mode');
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
});

// Sign up button
signupBtn.addEventListener('click', () => {
  showAuthForm('signup');
});

// Sign in button
signinBtn.addEventListener('click', () => {
  showAuthForm('signin');
});

// Sign out button
logoutBtn.addEventListener('click', async () => {
  try {
    await logout();
    updateAuthUI();
  } catch (error) {
    alert('Error signing out');
  }
});

// Close auth modal
authModalClose.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

authModal.addEventListener('click', (event) => {
  if (event.target === authModal) {
    authModal.classList.add('hidden');
  }
});

// Step 2: Add an event listener to the button
// When the user clicks it, the callback function runs
searchButton.addEventListener('click', handleSearch);

// Add Enter key support for search input
searchInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});

// Add filter event listeners
filterVegetarian.addEventListener('change', handleSearch);
filterVegan.addEventListener('change', handleSearch);
filterGlutenFree.addEventListener('change', handleSearch);
filterDairyFree.addEventListener('change', handleSearch);
filterCuisine.addEventListener('change', handleSearch);

// Function to handle search
function handleSearch() {
  const query = searchInput.value; // Get what the user typed
  
  if (query.trim() === '') {
    alert('Please enter a recipe to search for!');
    return;
  }

  // Switch to search view if we're in favorites or trending
  if (currentView === 'favorites') {
    currentView = 'search';
    updateFavoritesCount();
    sectionTitle.textContent = 'Search Results';
  } else if (currentView === 'trending') {
    currentView = 'search';
    viewTrendingBtn.style.display = 'block';
    sectionTitle.textContent = 'Search Results';
  }
  
  console.log('Searching for:', query);
  
  // Show loading message
  recipesContainer.classList.remove('is-empty');
  recipesContainer.innerHTML = '<p class="loading">🍳 Loading recipes...</p>';
  
  // Fetch recipes from TheMealDB API
  fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('API Response:', data);
      if (!data.meals) {
        recipesContainer.classList.add('is-empty');
        recipesContainer.innerHTML = `
          <div class="empty-state">
            <span class="empty-state-icon">🔍</span>
            <h3 class="empty-state-title">No Recipes Found</h3>
            <p class="empty-state-message">No recipes found for "${query}". Try a different search!</p>
          </div>
        `;
        lastSearchResults = [];
        return;
      }
      console.log('Recipes found:', data.meals.length);
      let filteredMeals = data.meals || [];
      
      // Apply filters
      const selectedCuisine = filterCuisine.value;
      if (selectedCuisine) {
        filteredMeals = filteredMeals.filter((meal: any) => meal.strArea === selectedCuisine);
      }
      
      // Filter by dietary restrictions (check meal names/tags)
      if (filterVegetarian.checked) {
        filteredMeals = filteredMeals.filter((meal: any) => 
          meal.strTags?.includes('Vegetarian') || meal.strMeal?.toLowerCase().includes('vegetarian')
        );
      }
      
      if (filterVegan.checked) {
        filteredMeals = filteredMeals.filter((meal: any) => 
          meal.strTags?.includes('Vegan') || meal.strMeal?.toLowerCase().includes('vegan')
        );
      }
      
      lastSearchResults = filteredMeals;
      displayRecipes(filteredMeals);
    })
    .catch(error => {
      console.error('Error fetching recipes:', error);
      recipesContainer.innerHTML = '<p class="error">Failed to fetch recipes. Please try again!</p>';
    });
}

// Close modal when X button is clicked
modalClose.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// Close modal when clicking outside the modal content
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.classList.add('hidden');
  }
});

// View favorites button click
viewFavoritesBtn.addEventListener('click', () => {
  if (currentView === 'search') {
    // Switch to favorites view
    displayFavorites();
    currentView = 'favorites';
    viewFavoritesBtn.textContent = `⬅️ Back to Search`;
    viewTrendingBtn.style.display = 'none';
    sectionTitle.textContent = 'My Favorites';
  } else {
    // Switch back to search view
    if (lastSearchResults.length > 0) {
      displayRecipes(lastSearchResults);
    } else {
      recipesContainer.classList.add('is-empty');
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          <h3 class="empty-state-title">Start Cooking!</h3>
          <p class="empty-state-message">Search for your favorite recipes using the search box above.</p>
        </div>
      `;
    }
    currentView = 'search';
    updateFavoritesCount();
    viewTrendingBtn.style.display = 'block';
    sectionTitle.textContent = 'Search Results';
  }
});

// View trending button click
viewTrendingBtn.addEventListener('click', () => {
  if (currentView !== 'trending') {
    displayTrendingRecipes();
    currentView = 'trending';
    viewFavoritesBtn.textContent = `⬅️ Back to Search`;
    viewTrendingBtn.style.display = 'none';
    sectionTitle.textContent = '🔥 Trending Now';
  } else {
    // Switch back to search view
    if (lastSearchResults.length > 0) {
      displayRecipes(lastSearchResults);
    } else {
      recipesContainer.classList.add('is-empty');
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          <h3 class="empty-state-title">Start Cooking!</h3>
          <p class="empty-state-message">Search for your favorite recipes using the search box above.</p>
        </div>
      `;
    }
    currentView = 'search';
    updateFavoritesCount();
    viewTrendingBtn.style.display = 'block';
    sectionTitle.textContent = 'Search Results';
  }
});

// Function to display recipes on the page
function displayRecipes(meals: any[]) {
  // Clear previous results
  recipesContainer.innerHTML = '';
  recipesContainer.classList.remove('is-empty');
  
  if (!meals || meals.length === 0) {
    recipesContainer.classList.add('is-empty');
    recipesContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🔍</span>
        <h3 class="empty-state-title">No Recipes Found</h3>
        <p class="empty-state-message">No recipes found. Try a different search!</p>
      </div>
    `;
    return;
  }
  
  // Loop through each meal and create a card
  meals.forEach(meal => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="recipe-image">
      <div class="recipe-info">
        <h3 class="recipe-title">${meal.strMeal}</h3>
        <div class="recipe-details">
          <p><strong>Category:</strong> ${meal.strCategory}</p>
          <p><strong>Cuisine:</strong> ${meal.strArea}</p>
        </div>
      </div>
    `;
    
    // Add click handler to open modal with full recipe details
    card.addEventListener('click', () => {
      openRecipeModal(meal.idMeal);
    });
    
    recipesContainer.appendChild(card);
  });
}

// Function to open recipe modal and fetch full details
function openRecipeModal(mealId: string) {
  // Fetch full recipe details
  fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`)
    .then(response => response.json())
    .then(data => {
      const meal = data.meals[0];
      
      // Build ingredients list
      let ingredients = '';
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
          ingredients += `<li>${measure} ${ingredient}</li>`;
        }
      }
      
      // Populate modal with recipe details
      modalBody.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="recipe-modal-image">
        <h2 class="recipe-modal-title">${meal.strMeal}</h2>
        
        <div class="rating-section">
          <div id="average-rating" class="average-rating">
            <span class="rating-stars">★★★★★</span>
            <span class="rating-count">(0 ratings)</span>
          </div>
          <div class="user-rating">
            <p class="rating-label">Rate this recipe:</p>
            <div id="star-rating" class="star-rating">
              <span class="star" data-value="1">★</span>
              <span class="star" data-value="2">★</span>
              <span class="star" data-value="3">★</span>
              <span class="star" data-value="4">★</span>
              <span class="star" data-value="5">★</span>
            </div>
          </div>
        </div>
        
        <button id="favorite-btn" class="favorite-btn">❤️ Add to Favorites</button>
        
        <div class="recipe-modal-section">
          <h3>Ingredients</h3>
          <ul>${ingredients}</ul>
        </div>
        
        <div class="recipe-modal-section">
          <h3>Instructions</h3>
          <p>${meal.strInstructions}</p>
        </div>
      `;
      
      // Load and display ratings
      loadRecipeRating(mealId);
      
      // Handle star rating clicks
      const starRating = document.getElementById('star-rating') as HTMLDivElement;
      if (starRating && currentUser) {
        const stars = starRating.querySelectorAll('.star');
        stars.forEach(star => {
          star.addEventListener('click', () => {
            const value = parseInt((star as HTMLElement).getAttribute('data-value') || '0');
            saveRating(mealId, value);
          });
          star.addEventListener('mouseover', () => {
            const value = parseInt((star as HTMLElement).getAttribute('data-value') || '0');
            updateStarDisplay(value);
          });
        });
        starRating.addEventListener('mouseout', () => {
          loadRecipeRating(mealId);
        });
      } else if (starRating && !currentUser) {
        starRating.style.opacity = '0.5';
        starRating.style.pointerEvents = 'none';
      }
      
      // Handle favorite button click
      const favoriteBtn = document.getElementById('favorite-btn') as HTMLButtonElement;
      favoriteBtn.addEventListener('click', () => {
        toggleFavorite(meal);
      });
      
      // Check if already favorited and update button
      updateFavoriteButton(mealId, favoriteBtn);
      
      // Show modal
      modal.classList.remove('hidden');
    })
    .catch(error => {
      console.error('Error fetching recipe details:', error);
      alert('Failed to load recipe details');
    });
}

// Function to toggle favorite status
function toggleFavorite(meal: any) {
  const favorites = getFavorites();
  const index = favorites.findIndex((fav: any) => fav.idMeal === meal.idMeal);
  
  if (index > -1) {
    // Already favorited, remove it
    favorites.splice(index, 1);
  } else {
    // Not favorited, add it - save a clean copy with essential properties
    const favoriteMeal = {
      idMeal: meal.idMeal,
      strMeal: meal.strMeal,
      strMealThumb: meal.strMealThumb,
      strCategory: meal.strCategory,
      strArea: meal.strArea
    };
    favorites.push(favoriteMeal);
  }
  
  // Save to localStorage
  localStorage.setItem('favorites', JSON.stringify(favorites));
  
  // Update button
  const favoriteBtn = document.getElementById('favorite-btn') as HTMLButtonElement;
  updateFavoriteButton(meal.idMeal, favoriteBtn);
  
  // Update favorites count
  updateFavoritesCount();
  
  // If we're viewing favorites and just removed one, refresh the view
  if (currentView === 'favorites') {
    displayFavorites();
  }
}

// Function to get favorites from localStorage
function getFavorites() {
  const stored = localStorage.getItem('favorites');
  return stored ? JSON.parse(stored) : [];
}

// Function to update favorite button appearance
function updateFavoriteButton(mealId: string, button: HTMLButtonElement) {
  const favorites = getFavorites();
  const isFavorited = favorites.some((fav: any) => fav.idMeal === mealId);
  
  if (isFavorited) {
    button.textContent = '❤️ Remove from Favorites';
    button.style.color = '#ff6b6b';
  } else {
    button.textContent = '🤍 Add to Favorites';
    button.style.color = '#666';
  }
}

// Function to display favorites
function displayFavorites() {
  const favorites = getFavorites();
  recipesContainer.innerHTML = '';
  recipesContainer.classList.remove('is-empty');
  
  if (favorites.length === 0) {
    recipesContainer.classList.add('is-empty');
    recipesContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">💔</span>
        <h3 class="empty-state-title">No Favorites Yet!</h3>
        <p class="empty-state-message">Search for recipes and add them to your favorites to see them here.</p>
      </div>
    `;
    return;
  }
  
  // Display favorites using the same displayRecipes function
  displayRecipes(favorites);
}

// Function to update favorites count in the button
function updateFavoritesCount() {
  const favorites = getFavorites();
  favoritesCount.textContent = favorites.length.toString();
  viewFavoritesBtn.textContent = `❤️ View Favorites (${favorites.length})`;
}

// Initialize favorites count on page load
updateFavoritesCount();

// ==================== AUTHENTICATION FUNCTIONS ====================

// Update UI based on auth state
function updateAuthUI() {
  if (currentUser) {
    // User is logged in
    authButtons.classList.add('hidden');
    userInfo.classList.remove('hidden');
    userEmail.textContent = currentUser.email;
    viewFavoritesBtn.disabled = false;
    updateFavoritesCount(); // Show their favorites count
  } else {
    // User is logged out
    authButtons.classList.remove('hidden');
    userInfo.classList.add('hidden');
    viewFavoritesBtn.disabled = true;
    favoritesCount.textContent = '0'; // Reset count to 0
    viewFavoritesBtn.textContent = `❤️ View Favorites (0)`; // Reset button text
    recipesContainer.classList.add('is-empty');
    recipesContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🔐</span>
        <h3 class="empty-state-title">Sign In Required</h3>
        <p class="empty-state-message">Please sign in to view your favorites</p>
      </div>
    `;
  }
}

// Show auth form (signup or signin)
function showAuthForm(type: 'signup' | 'signin') {
  const isSignup = type === 'signup';
  
  authFormContainer.innerHTML = `
    <form class="auth-form" id="auth-form">
      <h2>${isSignup ? 'Create Account' : 'Sign In'}</h2>
      
      <div class="error-message" id="error-message"></div>
      
      <div class="form-group">
        <label for="auth-email">Email</label>
        <input type="email" id="auth-email" required placeholder="your@email.com">
      </div>
      
      <div class="form-group">
        <label for="auth-password">Password</label>
        <input type="password" id="auth-password" required placeholder="At least 6 characters">
      </div>
      
      <button type="submit" class="auth-submit-btn">${isSignup ? 'Sign Up' : 'Sign In'}</button>
      
      <div class="toggle-auth">
        ${isSignup 
          ? 'Already have an account? <a id="toggle-signin">Sign In</a>' 
          : 'Don\'t have an account? <a id="toggle-signup">Sign Up</a>'}
      </div>
    </form>
  `;
  
  // Add form submission handler
  const authForm = document.getElementById('auth-form') as HTMLFormElement;
  const errorMessage = document.getElementById('error-message') as HTMLDivElement;
  const emailInput = document.getElementById('auth-email') as HTMLInputElement;
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
  
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      authModal.classList.add('hidden');
      updateAuthUI();
    } catch (error: any) {
      errorMessage.classList.add('show');
      errorMessage.textContent = error.message;
    }
  });
  
  // Toggle between sign up and sign in
  const toggleSignup = document.getElementById('toggle-signup');
  const toggleSignin = document.getElementById('toggle-signin');
  
  if (toggleSignup) {
    toggleSignup.addEventListener('click', () => showAuthForm('signup'));
  }
  if (toggleSignin) {
    toggleSignin.addEventListener('click', () => showAuthForm('signin'));
  }
  
  authModal.classList.remove('hidden');
}

// ==================== RATING SYSTEM ====================

// Save a rating for a recipe
async function saveRating(mealId: string, rating: number) {
  if (!currentUser) {
    alert('Please sign in to rate recipes!');
    return;
  }

  try {
    const { error } = await supabase
      .from('ratings')
      .upsert(
        {
          meal_id: mealId,
          user_id: currentUser.id,
          rating
        },
        { onConflict: 'meal_id,user_id' }
      );
    if (error) throw error;
    
    // Reload the rating display
    loadRecipeRating(mealId);
  } catch (error) {
    console.error('Error saving rating:', error);
  }
}

// Load and display average rating and user's rating
async function loadRecipeRating(mealId: string) {
  try {
    let userRating = 0;
    if (currentUser) {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating')
        .eq('meal_id', mealId)
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.rating) userRating = data.rating;
    }
    
    // For now, display user's rating if available
    updateStarDisplay(userRating);
  } catch (error) {
    console.error('Error loading rating:', error);
  }
}

// Update star display based on rating value
function updateStarDisplay(value: number) {
  const stars = document.querySelectorAll('.star');
  stars.forEach((star, index) => {
    if (index < value) {
      (star as HTMLElement).style.color = '#00c8ff';
    } else {
      (star as HTMLElement).style.color = 'rgba(160, 160, 160, 0.5)';
    }
  });
}
// ==================== TRENDING RECIPES ====================

// Display trending recipes (most popular meals)
async function displayTrendingRecipes() {
  // Popular meal IDs from TheMealDB
  const trendingMealIds = ['52772', '52977', '53013', '52975', '52958', '52813', '52855', '52874'];
  
  recipesContainer.innerHTML = '<p class="loading">🔥 Loading trending recipes...</p>';
  
  try {
    const trendingRecipes: any[] = [];
    
    // Fetch details for each trending meal
    for (const mealId of trendingMealIds) {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
      const data = await response.json();
      if (data.meals) {
        trendingRecipes.push(data.meals[0]);
      }
    }
    
    displayRecipes(trendingRecipes);
  } catch (error) {
    console.error('Error fetching trending recipes:', error);
    recipesContainer.innerHTML = '<p class="error">Failed to load trending recipes. Try again!</p>';
  }
}
console.log('Recipe Finder is ready! 🍳');

