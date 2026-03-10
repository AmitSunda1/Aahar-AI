import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSignupMutation, useGetMeQuery } from "../";

export const SignupForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [signup, { isLoading, error }] = useSignupMutation();
    const navigate = useNavigate();

    const { data: meData } = useGetMeQuery();
    if (meData?.data?.user) {
        if (!meData.data.user.isCompletedOnboarding) {
            return <Navigate to="/onboarding" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await signup({ email, password }).unwrap();

            if (!result.data.user.isCompletedOnboarding) {
                navigate("/onboarding");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            console.error("Signup failed:", err);
        }
    };

    return (
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
            <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">Sign Up</h2>

            {error && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded">
                    {(error as any)?.data?.message || "Failed to sign up. Please try again."}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {isLoading ? "Signing up..." : "Sign Up"}
                </button>
            </form>

            <p className="mt-4 text-sm text-center text-gray-600">
                Already have an account? <a href="/login" className="text-blue-600 hover:underline">Log in</a>
            </p>
        </div>
    );
};
