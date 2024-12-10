const ghpages = require('gh-pages');
const path = require('path');

ghpages.publish(
  path.join(__dirname, 'build'), // path to public directory
  {
    branch: 'gh-pages',
    repo: 'https://github.com/mxh77/pelletsFun.git', // Update to point to your repository
    user: {
      name: 'Your Name', // update to use your name
      email: 'your-email@example.com' // Update to use your email
    }
  },
  (err) => {
    if (err) {
      console.error('Error during deployment:', err);
    } else {
      console.log('Deployment successful!');
    }
  }
);