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
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  // const [currentUserMessage, setCurrentUserMessage] = useState("")

  console.log("currentAiMessage", currentAiMessage);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);
  const currentAiMessageRef = useRef("");
  const currentUserMessageRef = useRef("");

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
  ]);

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

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
      basePath: baseApiUrl(),
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      setIsAvatarTalking(true);
      // currentAiMessageRef.current = "";
      // setCurrentAiMessage("");
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

    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      setIsUserTalking(true);
    });

    avatar.current?.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
      console.log(">>>>> User started talking:", event?.detail?.message);
      if (event.detail?.message) {
        const newMessage = currentUserMessageRef.current
          ? `${currentUserMessageRef.current}${event?.detail?.message}`
          : event.detail.message;
        currentUserMessageRef.current = newMessage;
      }
    });

    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      setIsUserTalking(false);
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

  useEffect(() => {
    if (currentUserMessageRef.current) {
      setMessages((prev) => [
        ...prev,
        { text: currentUserMessageRef.current, sender: "user" },
      ]);
      if (!isUserTalking) {
        currentUserMessageRef.current = "";
      }
    }
  }, [isUserTalking]);

  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }

    setMessages((prev) => [...prev, { text: text, sender: "user" }]);
    
    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current
      .speak({ text: text, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC })
      .catch((e) => {
        console.log("e.message", e.message);

        setDebug(e.message);
      });
    console.log("textttttt", text);

    setIsLoadingRepeat(false);
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

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  console.log("messages", messages);
  console.log("current message", currentAiMessage);

  return (
    <div className="w-full flex flex-col gap-4">
      <Card className="bg-emerald-950 text-white">
        <CardBody className="h-[30rem] p-0 flex flex-row">
          {stream ? (
            <>
              {/* Left side - Avatar video */}
              <div className="w-1/3 border-r border-emerald-800 flex flex-col items-center justify-center bg-emerald-950 p-4">
                <div className="overflow-hidden rounded-[5%]  w-74 h-74 mb-8 border-4 border-emerald-700 relative">
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
              </div>

              {/* Right side - Chat */}
              <div className="w-2/3 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.map((message, index) => (
                    <>
                      {message?.text && (
                        <div
                          key={index}
                          className={`mb-4 flex ${
                            message.sender === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`rounded-lg p-4 max-w-md ${
                              message.sender === "user"
                                ? "bg-emerald-700 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-center items-center">
              <Spinner color="success" size="lg" />
            </div>
          )}
        </CardBody>
        <Divider className="bg-emerald-800" />
        <CardFooter className="flex flex-col gap-3 relative bg-emerald-950 p-4">
          <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              handleChangeChatMode(v);
            }}
            className="text-emerald-300"
            classNames={{
              tabList: "bg-emerald-900",
              cursor: "bg-emerald-500",
              tab: "text-emerald-300",
              tabContent: "group-data-[selected=true]:text-white",
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
          </Tabs>

          {chatMode === "text_mode" ? (
            <div className="w-full flex relative bg-emerald-900 rounded-full px-4 py-2 items-center">
              {/* <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label=""
                loading={isLoadingRepeat}
                placeholder="Ask me Anything?"
                setInput={setText}
                onSubmit={handleSpeak}
              /> */}
              <input
                type="text"
                placeholder="Ask me Anything?"
                className="bg-transparent border-none outline-none w-full text-white"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
              />
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
            </div>
          ) : (
            <div className="w-full text-center">
              <Button
                isDisabled={!isUserTalking}
                className="bg-emerald-700 text-white hover:bg-emerald-600"
                size="md"
                variant="shadow"
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </div>
          )}

          {/* <div className="absolute bottom-4 right-4 flex gap-2">
            <Button isIconOnly variant="light" className="text-emerald-300">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            <Button isIconOnly variant="light" className="text-emerald-300">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M23 12a11 11 0 01-22 0 11 11 0 0122 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 12a3 3 0 01-6 0 3 3 0 016 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div> */}
        </CardFooter>
      </Card>
    </div>
  );
}
