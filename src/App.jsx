import AndroidLifecycle from './components/AndroidLifecycle';
import NotificationSettings from './components/NotificationSettings';
import Body from "./components/Body";
import Login from "./components/Login";
import Feed from "./components/Feed";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from "./components/Profile";
import ViewProfile from "./components/ViewProfile";
import { Toast } from "./components/Toast";
import { Provider } from "react-redux";
import appStore from "./utils/appStore";
import Requests from "./components/Requests";
import Connections from "./components/Connections";
import Chat from "./components/Chat";
import AiDrawerLayout from "./components/AiDrawerLayout.jsx";
import ChatExperienceProvider from "./components/chat/ChatExperienceProvider.jsx";
import AiChatRoute from "./components/chat/AiChatRoute.jsx";
import Discover from "./components/Discover.jsx";
import DownloadAndroid from './components/DownloadAndroid.jsx';
import { useEffect } from 'react';
import { AI_SERVICE_URL } from './utils/constants';
import { warmIntegrationService } from './utils/integrationWarmup';

function Application() {
    useEffect(() => {
        // Public downloads never mount this component. Warm-up is deduplicated
        // by the service, including StrictMode and returning from /download.
        void warmIntegrationService(AI_SERVICE_URL);
    }, []);
    return (
                    <ChatExperienceProvider>
                    <AndroidLifecycle />
                    <AiDrawerLayout>
                        <Routes>
                            <Route path="/" element={<Body />}>
                                <Route path="/" element={<Feed />} />
                                <Route path="/discover" element={<Discover />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/connections" element={<Connections />} />
                                <Route path="/requests" element={<Requests />} />
                                <Route path="/settings/notifications" element={<NotificationSettings />} />
                                <Route path="/chat/ai-agent" element={<AiChatRoute />} />
                                <Route path="/chat/:targetUserId" element={<Chat />} />
                                <Route path="/profile/:userId" element={<ViewProfile />} />
                            </Route>
                        </Routes>
                    </AiDrawerLayout>
                    </ChatExperienceProvider>
    );
}

function App() {
    return (
        <>
            <Provider store={appStore}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/download" element={<DownloadAndroid />} />
                        <Route path="*" element={<Application />} />
                    </Routes>
                </BrowserRouter>
                <Toast />
            </Provider>
        </>
    );
}

export default App;
