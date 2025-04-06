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
import { log } from "console";

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
  const currentUserMessageRef = useRef("")


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

  useEffect(()=>{
    if (currentAiMessageRef.current) {
      setMessages((prev) => [
        ...prev,
        { text: currentAiMessageRef.current, sender: "ai" },
      ]);
      if(!isAvatarTalking){

        currentAiMessageRef.current = "";
      }
    }
  },[isAvatarTalking]);

  useEffect(()=>{
    if (currentUserMessageRef.current) {
      setMessages((prev) => [
        ...prev,
        { text: currentUserMessageRef.current, sender: "user" },
      ]);
      if(!isUserTalking){

        currentUserMessageRef.current = "";
      }
    }
  },[isUserTalking]);

  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
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
  console.log("current message", currentAiMessage)
  

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[20rem] flex flex-col justify-center items-center">
          {stream ? (
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 flex flex-col items-center justify-start p-2">
                <div className="">
                  <video
                    ref={mediaStream}
                    autoPlay
                    playsInline
                    style={{
                      width: "90%",
                      height: "90%",
                      objectFit: "contain",
                    }}
                  >
                    <track kind="captions" />
                  </video>
                </div>
              </div>

              <div className="w-2/3 flex flex-col">
                <div className="flex-1 overflow-y-auto p-2">
                  {messages.map((message, index) => (
                    <>
                    
                   {message?.text && <div
                      key={index}
                      className={`mb-4 flex ${message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                        }`}
                    >
                      <div
                        className={`rounded-lg p-4 max-w-md ${message.sender === "user"
                            ? "bg-emerald-700 text-white"
                            : "bg-emerald-600 text-white"
                          }`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                    </div>}
                    </>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col gap-3 relative">
          <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              handleChangeChatMode(v);
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
          </Tabs>
          {chatMode === "text_mode" ? (
            <div className="w-full flex relative">
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSpeak}
              />
              {text && (
                <Chip className="absolute right-16 top-3">Listening</Chip>
              )}
            </div>
          ) : (
            <div className="w-full text-center">
              <Button
                isDisabled={!isUserTalking}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                size="md"
                variant="shadow"
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
