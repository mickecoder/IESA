import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from 'react-hot-toast';

// Add this to your component
<Toaster position="top-right" />
import toast from 'react-hot-toast';

toast.success('Student added successfully!');
toast.error('Failed to save');
toast.loading('Importing students...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);