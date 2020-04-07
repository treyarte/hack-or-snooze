$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $('#all-articles-list');
  const $submitForm = $('#submit-form');
  const $filteredArticles = $('#filtered-articles');
  const $loginForm = $('#login-form');
  const $createAccountForm = $('#create-account-form');
  const $ownStories = $('#my-articles');
  const $mainNavLinks = $('.main-nav-links');
  const $navLogin = $('#nav-login');
  const $navLogOut = $('#nav-logout');
  const $navWelcome = $('#nav-welcome');
  const $userProfile = $('#user-profile');
  const $favoriteArticles = $('#favorited-articles');
  const $userStories = $('#my-articles');

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on('submit', async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $('#login-username').val();
    const password = $('#login-password').val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;

    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on('submit', async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $('#create-account-name').val();
    let username = $('#create-account-username').val();
    let password = $('#create-account-password').val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on('click', function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on('click', function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $('body').on('click', '#nav-all', async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
    addUSerFavorites();
  });

  /**
   * Event handler for showing user profile
   */
  $('#nav-user-profile').on('click', function () {
    hideElements();
    $('#user-profile').show();
  });

  /**
   * Event handler for favorites clicked
   */
  $('#nav-favorites').on('click', function () {
    if (!currentUser) return;
    hideElements();
    $favoriteArticles.empty();
    $allStoriesList.empty();

    const userFavorites = allStoryMaker(currentUser.favorites);

    if (!Array.isArray(userFavorites) || userFavorites.length === 0) {
      $favoriteArticles.append(
        "<strong>You don't have any Favorites yet!</strong>"
      );
    }

    $favoriteArticles.append(userFavorites);
    $favoriteArticles.show();
    addUSerFavorites();
  });

  $('#nav-my-stories').on('click', createMyStories);

  /**Creates the my stories article section */
  async function createMyStories() {
    if (!currentUser) return;

    hideElements();

    $favoriteArticles.empty();
    $allStoriesList.empty();
    $userStories.empty();

    await currentUser.getOwnStories();

    const userStories = allStoryMaker(currentUser.ownStories);

    if (!Array.isArray(userStories) || userStories.length === 0) {
      $userStories.append("<strong>You don't have any stories yet!</strong>");
    }

    $userStories.append(userStories);

    $userStories.show();
    addUSerFavorites();
    appendTrashIcon(currentUser.ownStories);
  }

  /*Function that generate a list of stories markup when passed in a list of stories */
  function allStoryMaker(storyList) {
    const results = [];
    for (let story of storyList) {
      results.push(generateStoryHTML(story));
    }
    return results;
  }

  /* Function that fills out user profile section*/
  function fillUserProfile() {
    if (!currentUser) return null;

    $('#user-profile section')
      .children('#profile-name')
      .append(' ' + currentUser.name);

    $('#user-profile section')
      .children('#profile-username')
      .append(' ' + currentUser.username);

    const date = convertDate(currentUser.createdAt);

    $('#user-profile section')
      .children('#profile-account-date')
      .append(' ' + date);
  }

  /**
   * Event listener for clicking favorite icon
   */
  $allStoriesList.on('click', '.star', handleFavoriteClick);
  $favoriteArticles.on('click', '.star', handleFavoriteClick);
  $userStories.on('click', '.star', handleFavoriteClick);
  $userStories.on('click', '.trash-can', handleRemoveStory);

  /**
   * Event handler for clicking submit navigation button
   */
  $('#nav-submit').on('click', () => {
    $submitForm.slideToggle();
  });

  /**
   * Event listener for article form submission
   */
  $submitForm.on('submit', handleFormSubmit);

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      fillUserProfile();
      addUSerFavorites();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger('reset');
    $createAccountForm.trigger('reset');

    generateStories();

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    addUSerFavorites();
    fillUserProfile();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
    addUSerFavorites();
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let favoriteSpan = '<span></span>';

    if (currentUser) {
      favoriteSpan = '<span class="star"><i class="far fa-star"></i></span>';
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${favoriteSpan}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favoriteArticles,
      $userStories,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $mainNavLinks.show();
    displayUsername();
  }

  /* set the user name for the user profile anchor tag */
  function displayUsername() {
    $navWelcome.children('#nav-user-profile').text(currentUser.username);
    $navWelcome.show();
  }

  /**
   * Add favorite icon to user's favorite stories
   */
  function addUSerFavorites() {
    if (!currentUser) return;

    for (let favorite of currentUser.favorites) {
      $(`#${favorite.storyId}`)
        .children('span')
        .children('i')
        .removeClass('far fa-star')
        .addClass('fas fa-star')
        .addClass('favorite');
    }
  }

  /*Add trash can icon to each user story */
  function appendTrashIcon(userStories) {
    for (let userStory of userStories) {
      $(`#${userStory.storyId}`).prepend(
        '<span class="trash-can"><i class="fas fa-trash-alt"></i></span>'
      );
    }
  }

  /*Removes a user story*/
  async function handleRemoveStory(evt) {
    const storyId = evt.target.parentNode.parentNode.id;
    await storyList.deleteStory(currentUser, storyId);
    createMyStories();
  }

  /**
   * Event handler for when the article form is submitted
   */
  async function handleFormSubmit(evt) {
    evt.preventDefault();

    const author = $('#author').val();
    const title = $('#title').val();
    const url = $('#url').val();

    $('#author').val('');
    $('#title').val('');
    $('#url').val('');

    //getting a new story object
    const newStory = await storyList.addStory(currentUser, {
      author,
      title,
      url,
    });

    //generating the html markup for a story and adding it to the story list
    $allStoriesList.prepend(generateStoryHTML(newStory));
    $userStories.prepend(
      generateStoryHTML(newStory).prepend(
        '<span class="trash-can"><i class="fas fa-trash-alt"></i></span>'
      )
    );
    if ($userStories.children('strong')) {
      $userStories.children('strong').remove();
    }
    $submitForm.slideToggle();
  }

  /**
   * Event handler for adding favorite article
   */
  async function handleFavoriteClick(evt) {
    const storyId = $(evt.target).parents('li').attr('id');
    let message = '';
    if ($(evt.target).hasClass('favorite')) {
      message = await currentUser.deleteFavoriteStory(storyId);
      if (message === 'Favorite Removed!') {
        $(evt.target)
          .removeClass('fas fa-star favorite')
          .addClass('far fa-star');
      }
    } else {
      message = await currentUser.favoriteStory(storyId);
      if (message === 'Favorite Added!') {
        $(evt.target)
          .removeClass('far fa-star')
          .addClass('fas fa-star favorite');
      }
    }
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf('://') > -1) {
      hostName = url.split('/')[2];
    } else {
      hostName = url.split('/')[0];
    }
    if (hostName.slice(0, 4) === 'www.') {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem('token', currentUser.loginToken);
      localStorage.setItem('username', currentUser.username);
    }
  }

  /* simple function that convert a string into a date */
  function convertDate(str) {
    const date = new Date(str);
    return date.toDateString();
  }
});
