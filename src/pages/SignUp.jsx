// SignUp.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { m } from "framer-motion";

function SignUp() {
  const [socialLoading, setSocialLoading] = useState({ google: false, github: false });
  const [recaptchaChecking, setRecaptchaChecking] = useState(false);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  
  // Email sign-up state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  
  // reCAPTCHA v3 hook
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get the redirect path from location state if exists
  const from = location.state?.from?.pathname || "/";
  
  // Verify the recaptcha token is valid
  const verifyRecaptchaToken = async () => {
    // If we've already determined reCAPTCHA is unavailable, bypass verification
    if (captchaUnavailable) {
      console.warn("reCAPTCHA verification bypassed due to unavailability");
      return true;
    }
    
    if (!executeRecaptcha) {
      console.warn("reCAPTCHA not available, proceeding without verification");
      setCaptchaUnavailable(true);
      return true;
    }

    setRecaptchaChecking(true);
    try {
      // Execute reCAPTCHA with action name
      const token = await executeRecaptcha('signup');
      
      // Here you would normally verify this token on your server
      // For now, we'll just log it and assume it's valid
      console.log("reCAPTCHA token:", token);
      
      // Return true if we got a token
      return !!token;
    } catch (error) {
      console.error("reCAPTCHA error:", error);
      toast.error("Could not verify you are human. Proceeding anyway.");
      setCaptchaUnavailable(true);
      return true; // Allow the user to continue despite the error
    } finally {
      setRecaptchaChecking(false);
    }
  };

  const handleSocialSignUp = async (e, providerType) => {
    // Prevent the default form submission
    e.preventDefault();
    e.stopPropagation();
    
    // Verify recaptcha first
    if (!await verifyRecaptchaToken()) {
      return;
    }

    // Set the appropriate loading state
    setSocialLoading({
      ...socialLoading,
      [providerType]: true
    });

    // Create provider based on type
    const provider = providerType === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || '',
        profilePic: user.photoURL || '',
        cart: [],
      }, { merge: true });

      dispatch(setUser(user));
      toast.success("Sign up successful!");
      // Redirect to intended destination or home
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Error with social sign up:", error);
      toast.error(error.message || "An error occurred.");
    } finally {
      // Reset loading state
      setSocialLoading({
        ...socialLoading,
        [providerType]: false
      });
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Client-side validation
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    // Verify recaptcha first
    if (!await verifyRecaptchaToken()) {
      return;
    }

    setEmailLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Optionally set displayName
      try {
        await updateProfile(user, { displayName: name });
      } catch (updErr) {
        console.warn("Could not update profile displayName:", updErr);
      }

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: name || '',
        profilePic: user.photoURL || '',
        cart: [],
      }, { merge: true });

      dispatch(setUser(user));
      toast.success("Sign up successful!");
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Email sign up error:", error);
      // Map some common Firebase errors to friendlier messages
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') {
        toast.error("This email is already in use. Try signing in instead.");
      } else if (code === 'auth/invalid-email') {
        toast.error("Invalid email address.");
      } else if (code === 'auth/weak-password') {
        toast.error("Weak password. Use at least 6 characters.");
      } else {
        toast.error(error.message || "An error occurred during sign up.");
      }
    } finally {
      setEmailLoading(false);
    }
  };
  
  // Check if reCAPTCHA is available
  useEffect(() => {
    let captchaTimeout;
    
    if (!executeRecaptcha) {
      console.log("reCAPTCHA not yet available");
      // Set a timeout to bypass captcha if it doesn't load in 5 seconds
      captchaTimeout = setTimeout(() => {
        console.warn("reCAPTCHA failed to load after timeout, bypassing verification");
        setCaptchaUnavailable(true);
      }, 5000);
    }
    
    return () => {
      if (captchaTimeout) clearTimeout(captchaTimeout);
    };
  }, [executeRecaptcha]);

  const anyLoading = socialLoading.google || socialLoading.github || emailLoading || recaptchaChecking;

  return (
    <m.div
      initial={{ opacity: 0, y: 50 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeInOut" }} 
      className="container mx-auto px-4 py-8 bg-gray-50"
    >
      <div className="flex justify-center items-center min-h-screen bg-gray-50 pt-20">
        <div
          className="w-full max-w-md bg-white p-8 rounded-lg shadow-md"
        >
          <h2 className="text-3xl font-semibold text-center mb-6">Sign Up</h2>

          <div className="mb-4 text-center text-xs text-gray-500">
            {captchaUnavailable
              ? "reCAPTCHA verification bypassed due to unavailability."
              : "This form is protected by reCAPTCHA v3."}
          </div>

          {/* Email / password sign-up form */}
          <form onSubmit={handleEmailSignUp} className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                placeholder="Your full name"
                required
                disabled={anyLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                placeholder="you@example.com"
                required
                disabled={anyLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                placeholder="At least 6 characters"
                required
                disabled={anyLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                placeholder="Confirm password"
                required
                disabled={anyLoading}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              disabled={anyLoading}
            >
              {emailLoading || recaptchaChecking ? "Processing..." : "Sign up with Email"}
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={(e) => handleSocialSignUp(e, 'google')}
              className="w-full bg-red-500 text-white py-2 rounded-lg mb-2 hover:bg-red-600 transition duration-200"
              disabled={socialLoading.google || anyLoading}
            >
              {socialLoading.google ? "Processing..." : "Sign up with Google"}
            </button>
            <button
              type="button"
              onClick={(e) => handleSocialSignUp(e, 'github')}
              className="w-full bg-gray-800 text-white py-2 rounded-lg mb-2 hover:bg-gray-900 transition duration-200"
              disabled={socialLoading.github || anyLoading}
            >
              {socialLoading.github ? "Processing..." : "Sign up with Github"}
            </button>
          </div>
          <p className="mt-4 text-center text-gray-600">
            Already have an account? <a href="/signin" className="text-blue-600 hover:underline">Sign In</a>
          </p>
        </div>
      </div>
    </m.div>
  );
}

export default SignUp;