"use client"

export const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
    <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/50">
      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-r-purple-500 mx-auto"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-300 opacity-20 mx-auto"></div>
      </div>
      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
        Loading Accident Details
      </h2>
      <p className="text-gray-600 mb-4">Please wait while we fetch the information...</p>
      <div className="flex justify-center space-x-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
      </div>
    </div>
  </div>
)

export const ErrorScreen = ({
  error,
  onBackClick,
}: {
  error: string
  onBackClick: () => void
}) => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center">
    <div className="text-center bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-red-200">
      <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-xl">
        <svg className="w-10 h-10 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || "Accident Not Found"}</h2>
      <p className="text-gray-600 mb-6">We couldn't load the accident details. Please try again.</p>
      <button
        onClick={onBackClick}
        className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </button>
    </div>
  </div>
)
