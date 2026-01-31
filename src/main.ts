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

// Track current view
let currentView: 'search' | 'favorites' = 'search';
let lastSearchResults: any[] = []; // Store last search results

// Step 2: Add an event listener to the button
// When the user clicks it, the callback function runs
searchButton.addEventListener('click', handleSearch);

// Add Enter key support for search input
searchInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});

// Function to handle search
function handleSearch() {
  const query = searchInput.value; // Get what the user typed
  
  if (query.trim() === '') {
    alert('Please enter a recipe to search for!');
    return;
  }

  // Switch to search view if we're in favorites
  if (currentView === 'favorites') {
    currentView = 'search';
    updateFavoritesCount();
    sectionTitle.textContent = 'Search Results';
  }
  
  console.log('Searching for:', query);
  
  // Show loading message
  recipesContainer.innerHTML = '<p class="loading">🍳 Loading recipes...</p>';
  
  // Fetch recipes from TheMealDB API
  fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`)
    .then(response => response.json())
    .then(data => {
      console.log('Recipes found:', data);
      lastSearchResults = data.meals || []; // Save search results
      displayRecipes(data.meals);
    })
    .catch(error => {
      console.error('Error fetching recipes:', error);
      recipesContainer.innerHTML = '<p class="error">Failed to fetch recipes. Try again!</p>';
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
    sectionTitle.textContent = 'My Favorites';
  } else {
    // Switch back to search view
    if (lastSearchResults.length > 0) {
      displayRecipes(lastSearchResults);
    } else {
      recipesContainer.innerHTML = '<p class="loading">Search for recipes using the search box above!</p>';
    }
    currentView = 'search';
    updateFavoritesCount();
    sectionTitle.textContent = 'Search Results';
  }
});

// Function to display recipes on the page
function displayRecipes(meals: any[]) {
  // Clear previous results
  recipesContainer.innerHTML = '';
  
  if (!meals || meals.length === 0) {
    recipesContainer.innerHTML = '<p class="loading">No recipes found. Try a different search!</p>';
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
  
  if (favorites.length === 0) {
    recipesContainer.innerHTML = '<p class="loading">No favorites yet! Search for recipes and add them to your favorites.</p>';
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

console.log('Recipe Finder is ready! 🍳');
