const apiBase = "https://jsonplaceholder.typicode.com";
const content = document.getElementById("content");
const breadcrumb = document.getElementById("breadcrumb");
const loading = document.createElement("div");

// Create loading spinner
loading.id = "loading";
loading.className =
  "hidden fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center";
loading.innerHTML = `<div class="loader border-t-4 border-blue-500 w-12 h-12 rounded-full animate-spin"></div>`;
document.body.appendChild(loading);

// Caches
let cachedAlbums = {};
let cachedPhotos = {};

// Utility: Show/Hide loading spinner
function showLoading() {
  loading.classList.remove("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

// Utility: Set breadcrumb navigation
function setBreadcrumb(items) {
  breadcrumb.innerHTML = items
    .map(
      (item, index) => `
            <span class="${
              index < items.length - 1 ? "text-blue-500 cursor-pointer" : ""
            }" 
                  onclick="${item.onclick}">
                ${item.label}
            </span>
        `
    )
    .join(" / ");
}

// Animate grid entry
function animateGrid() {
  gsap.fromTo(
    ".grid > div",
    { opacity: 0, y: 20 },
    { opacity: 1, duration: 1, stagger: 0.2, ease: "ease-in" }
  );
}

// Fetch data with loading indicator
async function fetchData(url) {
  showLoading();
  const res = await fetch(url);
  hideLoading();
  return res.json();
}

function handleImageError(event) {
  event.target.src = "https://via.placeholder.com/150?text=No+Image"; // Placeholder for broken images
}

// Cache with expiration time for user images
const userImageCache = {};

// Utility: Get a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Utility: Fetch random user image and cache it for 1 hour
async function getRandomUserImage(userId) {
  const cacheEntry = userImageCache[userId];

  // Check if image is already cached and still valid
  if (cacheEntry && Date.now() - cacheEntry.timestamp < 3600000) {
    // 1 hour = 3600000 ms
    return cacheEntry.image;
  }

  // Fetch random image
  const albums = await fetchData(`${apiBase}/users/${userId}/albums`);
  if (albums.length > 0) {
    const randomAlbum = getRandomItem(albums);
    const photos = await fetchData(
      `${apiBase}/albums/${randomAlbum.id}/photos`
    );
    if (photos.length > 0) {
      const randomPhoto = getRandomItem(photos);
      userImageCache[userId] = {
        image: randomPhoto.thumbnailUrl,
        timestamp: Date.now(),
      }; // Cache the result
      return randomPhoto.thumbnailUrl;
    }
  }

  // Fallback image if no albums or photos exist
  return "https://via.placeholder.com/150?text=No+Image";
}

// Fetch and display users
async function fetchUsers() {
  setBreadcrumb([{ label: "Users", onclick: "fetchUsers()" }]);
  const users = await fetchData(`${apiBase}/users`);

  // Pre-fetch albums for users
  const albumPromises = users.map((user) =>
    fetchData(`${apiBase}/users/${user.id}/albums`)
  );
  const albumsData = await Promise.all(albumPromises);
  users.forEach((user, index) => {
    cachedAlbums[user.id] = albumsData[index];
  });

  // Fetch random images for users asynchronously
  const userImagePromises = users.map((user) => getRandomUserImage(user.id));
  const userImages = await Promise.all(userImagePromises);

  // Render user grid
  content.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            ${users
              .map((user, index) => {
                const thumbnail = userImages[index];
                return `
                        <div class="p-4 bg-white cursor-pointer flex justify-center flex-col block hover:bg-blue-100 transition duration-500 ease-in-out" onclick="fetchAlbums(${user.id})">
                            <img src="${thumbnail}" alt="${user.name}" class="mb-2" loading="lazy">
                            <h3 class="text-lg font-bold">${user.username}</h3>
                            <p class="text-sm text-gray-500">${user.name}</p>
                        </div>
                    `;
              })
              .join("")}
        </div>
    `;
  animateGrid();
}

// Cache with expiration time for album images
const albumImageCache = {};

// Utility: Fetch random album images and cache them for 1 hour
async function getRandomAlbumImages(albumId) {
  const cacheEntry = albumImageCache[albumId];

  // Check if images are already cached and still valid
  if (cacheEntry && Date.now() - cacheEntry.timestamp < 3600000) {
    // 1 hour = 3600000 ms
    return cacheEntry.images;
  }

  // Fetch photos for the album
  const photos = await fetchData(`${apiBase}/albums/${albumId}/photos`);
  const randomImages = photos
    .sort(() => 0.5 - Math.random()) // Shuffle the array
    .slice(0, 4) // Get up to 4 random photos
    .map((photo) => photo.thumbnailUrl);

  albumImageCache[albumId] = { images: randomImages, timestamp: Date.now() }; // Cache the result
  return randomImages;
}

// Fetch and display albums
async function fetchAlbums(userId) {
  const user = await fetchData(`${apiBase}/users/${userId}`);
  const albums = cachedAlbums[userId] || [];

  setBreadcrumb([
    { label: "Users", onclick: "fetchUsers()" },
    { label: user.name, onclick: `fetchAlbums(${userId})` },
  ]);

  // Fetch random images for all albums asynchronously
  const albumImagePromises = albums.map((album) =>
    getRandomAlbumImages(album.id)
  );
  const albumImagesArray = await Promise.all(albumImagePromises);

  content.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${albums
              .map((album, index) => {
                const albumImages = albumImagesArray[index];
                return `
                        <div class="p-8 bg-white shadow cursor-pointer hover:bg-blue-100 transition duration-500 ease-in-out" onclick="fetchPhotos(${
                          album.id
                        })">
                            <div class="grid grid-cols-2 gap-2 !justify-items-center">
                                ${albumImages
                                  .map(
                                    (image) => `
                                        <img src="${image}" alt="${album.title}" class="">
                                    `
                                  )
                                  .join("")}
                            </div>
                            <h3 class="text-lg font-bold text-center mt-6">${
                              album.title
                            }</h3>
                        </div>
                    `;
              })
              .join("")}
        </div>
    `;
  animateGrid();
}

// Fetch and display photos
async function fetchPhotos(albumId) {
  if (!cachedPhotos[albumId]) {
    cachedPhotos[albumId] = await fetchData(
      `${apiBase}/albums/${albumId}/photos`
    );
  }
  const photos = cachedPhotos[albumId];
  const album = await fetchData(`${apiBase}/albums/${albumId}`);
  const user = await fetchData(`${apiBase}/users/${album.userId}`);

  setBreadcrumb([
    { label: "Users", onclick: "fetchUsers()" },
    { label: user.name, onclick: `fetchAlbums(${user.id})` },
    { label: album.title, onclick: `fetchPhotos(${albumId})` },
  ]);

  content.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            ${photos
              .map(
                (photo) => `
                    <div class="relative p-4 bg-white shadow cursor-pointer hover:bg-blue-100 transition duration-500 ease-in-out flex justify-center flex-col" onclick="showPhoto(${photo.id}) ">
                        <img src="${photo.thumbnailUrl}" alt="${photo.title}" class="" loading="lazy">
                        <div class=" bottom-0 p-2 w-full text-left ">
                            ${photo.title}
                        </div>
                    </div>
                `
              )
              .join("")}
        </div>
    `;
  animateGrid();
}

// Show full-screen photo
async function showPhoto(photoId) {
  const photo = await fetchData(`${apiBase}/photos/${photoId}`);
  const album = await fetchData(`${apiBase}/albums/${photo.albumId}`);
  const user = await fetchData(`${apiBase}/users/${album.userId}`);

  content.innerHTML = `
        <div class="relative h-full p-4 bg-white shadow rounded cursor-pointer flex justify-center flex-col">
            <img src="${photo.url}" alt="${photo.title}" class="w-full h-full object-contain">
            <div class="absolute bottom-0 bg-gray-900 bg-opacity-80 text-white p-4 w-full">
                <h2 class="text-lg font-bold uppercase">${photo.title}</h2>
                <p><strong>Album:</strong> ${album.title}</p>
                <p><strong>User:</strong> ${user.name}</p>
                <button class="mt-2 p-2 bg-red-500 rounded" onclick="fetchPhotos(${album.id})">Close</button>
            </div>
        </div>
    `;
}

// Initialize the app
fetchUsers();
