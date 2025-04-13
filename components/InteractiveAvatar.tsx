"use client";
import type { StartAvatarResponse } from "@heygen/streaming-avatar";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

type Message = {
  text: string;
  sender: "user" | "ai";
};

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  // const [currentUserMessage, setCurrentUserMessage] = useState("")

  // console.log("currentAiMessage", currentAiMessage);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);
  const currentAiMessageRef = useRef("");
  const currentUserMessageRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState([
    {
      text: "Lorem Ipsum is simply dummy text of the printing and",
      sender: "ai",
    },
    { text: "How can I help you today?", sender: "user" },
    {
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      sender: "ai",
    },
    {
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      sender: "user",
    },
    {
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      sender: "user",
    },
    {
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      sender: "ai",
    },
    {
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
      sender: "user",
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    startSession();
  }, []);

  function baseApiUrl() {
    return process.env.NEXT_PUBLIC_BASE_API_URL;
  }

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  const handleStartSession = async()=>{
    const userId = "user_123"
    const sessionId = "session_123";
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, sessionId }),
      });

      const data = await res.json();
      console.log('Session Start Response:', data);
    } catch (err) {
      console.error('Error starting session:', err);
    }
  };
  

  async function startSession() {
    setIsLoadingSession(true);

    const newToken = await fetchAccessToken();
    handleStartSession()
   

  avatar.current = new StreamingAvatar({
    token: newToken,
    basePath: baseApiUrl(),
  });

  avatar.current?.on(StreamingEvents.USER_START, (event) => {
    setIsVoiceMode(true);
    setIsUserTalking(true);
  });

  avatar.current?.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
    console.log(">>>>> User started talking:", event?.detail?.message);
    if (event?.detail?.message) {
      setMessages((prev) => [
        ...prev,
        { text: event?.detail?.message, sender: "user" },
      ]);
      currentUserMessageRef.current = "";
    }
  });

  avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
    setIsVoiceMode(false);
    setIsUserTalking(false);
    console.log(
      "currentUserMessageRef.current",
      currentUserMessageRef.current
    );

    if (currentUserMessageRef.current) {
      setMessages((prev) => [
        ...prev,
        { text: currentUserMessageRef.current, sender: "user" },
      ]);
      currentUserMessageRef.current = "";
    }
  });
  avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
    setIsAvatarTalking(true);
  });

  // avator is talking
  avatar.current.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (e) => {
    if (e.detail?.message) {
      const newMessage = currentAiMessageRef.current
        ? `${currentAiMessageRef.current}${e.detail.message}`
        : e.detail.message;
      currentAiMessageRef.current = newMessage;
      setCurrentAiMessage(newMessage);
    }
  });

  // this  is stope talking
  avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
    console.log("Avatar stopped talking", e);
    setIsAvatarTalking(false);
  });

  avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
    console.log("Stream disconnected");
    endSession();
  });
  avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
    console.log(">>>>> Stream ready:", event.detail);
    setStream(event.detail);
  });

  try {
    const res = await avatar.current.createStartAvatar({
      quality: AvatarQuality.Low,
      avatarName: "6892d4f6f97747ae99c726ab032c1a20",
      knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
      voice: {
        rate: 1.5, // 0.5 ~ 1.5
        emotion: VoiceEmotion.EXCITED,
        // elevenlabsSettings: {
        //   stability: 1,
        //   similarity_boost: 1,
        //   style: 1,
        //   use_speaker_boost: false,
        // },
      },
      language: language,
      disableIdleTimeout: true,
    });

    setData(res);
    // default to voice mode
    await avatar.current?.startVoiceChat({
      useSilencePrompt: false,
    });
    setChatMode("voice_mode");
  } catch (error) {
    console.error("Error starting avatar session:", error);
  } finally {
    setIsLoadingSession(false);
  }
}

useEffect(() => {
  if (currentAiMessageRef.current) {
    setMessages((prev) => [
      ...prev,
      { text: currentAiMessageRef.current, sender: "ai" },
    ]);
    if (!isAvatarTalking) {
      currentAiMessageRef.current = "";
    }
  }
}, [isAvatarTalking]);

async function handleSpeak() {
  setIsLoadingRepeat(true);
  if (!avatar.current) {
    setDebug("Avatar API not initialized");

    return;
  }

  // speak({ text: text, task_type: TaskType.REPEAT })
  await avatar.current
    .speak({ text: text, taskType: TaskType.TALK, taskMode: TaskMode.SYNC })
    .catch((e) => {
      console.log("e.message", e.message);

      setDebug(e.message);
    });

  setIsLoadingRepeat(false);
  setText("");
}

async function handleInterrupt() {
  if (!avatar.current) {
    setDebug("Avatar API not initialized");

    return;
  }
  await avatar.current.interrupt().catch((e) => {
    setDebug(e.message);
  });
}

async function endSession() {
  await avatar.current?.stopAvatar();
  setStream(undefined);
}

const handleChangeChatMode = useMemoizedFn(async (v) => {
  if (v === chatMode) {
    return;
  }
  if (v === "text_mode") {
    avatar.current?.closeVoiceChat();
    setIsVoiceMode(false);
  } else {
    await avatar.current?.startVoiceChat();
  }
  setChatMode(v);
});

const previousText = usePrevious(text);

useEffect(() => {
  if (!previousText && text) {
    avatar.current?.startListening();
  } else if (previousText && !text) {
    avatar?.current?.stopListening();
  }
}, [text, previousText]);

useEffect(() => {
  return () => {
    endSession();
  };
}, []);

const [isVideoPlaying, setIsVideoPlaying] = useState(false);

useEffect(() => {
  if (stream && mediaStream.current) {
    mediaStream.current.srcObject = stream;
    mediaStream.current.onloadedmetadata = () => {
      mediaStream.current?.play();
      setDebug("Playing");
    };
  }
}, [mediaStream, stream]);

console.log("messages", messages);
// console.log("current message", currentAiMessage);
const handlePlayVideo = () => {
  if (mediaStream.current) {
    mediaStream.current
      .play()
      .then(() => {
        setDebug("Playing");
        setIsVideoPlaying(true);
      })
      .catch((error) => {
        console.error("Error playing video:", error);
        setDebug("Error playing video");
      });
  }
};

return (
  <div className="flex h-screen bg-emerald-950 text-white p-4 font-sans">
    <div className="flex flex-col w-full max-w-6xl mx-auto rounded-lg bg-emerald-950 border border-emerald-800">
      <div className="flex flex-col md:flex-row flex-1 overflow-auto md:overflow-hidden">
        {/* Left Side */}
        <div className="w-full md:w-1/3 border-b md:border-r border-emerald-800 flex flex-col items-center justify-center bg-emerald-950 p-4">
          {stream ? (
            <>
              <div className="md:overflow-hidden rounded-[3%] md:rounded-[5%] w-[10rem] md:w-[11rem] lg:w-[15rem] h-[12rem] md:h-[23rem] mt-5 md:my-8 border-4 border-emerald-700 relative ">
                <video
                  ref={mediaStream}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "5%",
                    // marginTop: "2rem"
                  }}
                >
                  <track kind="captions" />
                </video>

              </div>
              <div className="relative w-24 md:w-32 h-24 md:h-32 flex items-center justify-center">
                <div className="absolute w-14 md:w-24 h-14 md:h-24 bg-cyan-400 opacity-20 rounded-full blur-xl"></div>
                <div className="absolute w-10 md:w-20 h-1 md:h-1 bg-cyan-400 opacity-30"></div>
                <div className="absolute transform rotate-45 w-10 md:w-20 h-1 md:h-1 bg-cyan-400 opacity-30"></div>
                <div className="absolute transform -rotate-45 w-10 md:w-20 h-1 md:h-1 bg-cyan-400 opacity-30"></div>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-center items-center h-[13rem]">
              <Spinner color="success" size="lg" />
              {/* <p>Loading...</p> */}
            </div>
          )}
        </div>
        {!isVideoPlaying && (
          <button
            onClick={handlePlayVideo}
            className="bg-emerald-700 text-white px-4 py-2 rounded"
          >
            Play Video
          </button>
        )}

        {/* Chat Area */}
        <div className="w-full md:w-2/3 flex flex-col h-screen md:h-auto mb-[3rem] md:mb-0">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <>
                {message?.text && (
                  <div
                    key={index}
                    className={`mb-4 flex ${message.sender === "user"
                      ? "justify-end"
                      : "justify-start"
                      }`}
                  >
                    <div
                      className={`rounded-lg p-4 max-w-md ${message.sender === "user"
                        ? "bg-green-200 text-black"
                        : "bg-white text-gray-800"
                        }`}
                    >
                      <p className="text-[0.8rem] md:text-sm leading-relaxed">
                        {message.text}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ))}

            {isUserTalking && (
              <div className="flex justify-center items-center my-4">
                <div className="bg-emerald-800 rounded-full px-6 py-2 flex items-center animate-pulse">
                  <div className="mr-2 w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Listening...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="fixed bottom-0 right-0 md:relative w-full  p-4 bg-emerald-950 border-t border-emerald-800">
            <div className="flex items-center">
              <div className="hidden w-10 h-10 bg-emerald-700 rounded-full flex-shrink-0 md:flex md:items-center md:justify-center">
                <span className="text-xs">You</span>
              </div>
              <div className="flex-1 mx-3">
                <div className="bg-emerald-900 rounded-full px-4 py-2 flex items-center">
                  <input
                    type="text"
                    placeholder="Ask me Anything?"
                    className="bg-transparent border-none outline-none w-full text-white"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setTimeout(() => {
                        handleChangeChatMode("text_mode");
                      }, 1000);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
                    disabled={!stream}
                  />
                  {isLoadingRepeat ? (
                    <Spinner color="success" size="sm" />
                  ) : (
                    // "Load"
                    <button
                      className="ml-2 text-white hover:text-emerald-300 transition-colors"
                      onClick={handleSpeak}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </button>
                  )}
                  <button
                    className={`ml-2 transition-colors ${isVoiceMode
                      ? "text-red-500"
                      : "text-white hover:text-emerald-300"
                      }`}
                    onClick={() => {
                      handleChangeChatMode("voice_mode");
                      setIsVoiceMode(true);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
