import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatTime } from '../utils/audioChunker';

export default function AudioPlayerSync({ audioUrl, segments }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const activeSegmentRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (segments && segments.length > 0) {
      const index = segments.findIndex(
        (seg) => time >= seg.startTime && time <= seg.endTime
      );
      if (index !== activeSegmentIndex) {
        setActiveSegmentIndex(index);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const seekToSegment = (seg) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seg.startTime;
      setCurrentTime(seg.startTime);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />

      {/* Barre de contrôle du lecteur audio */}
      <View style={styles.playerBarContainer}>
        <View style={styles.playerBar}>
          <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </TouchableOpacity>

          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              flex: 1,
              marginHorizontal: 12,
              accentColor: '#6366f1',
              cursor: 'pointer',
            }}
          />

          <Text style={styles.timeText}>{formatTime(duration)}</Text>

          {/* Sélecteur de vitesse de lecture */}
          <View style={styles.speedBox}>
            {[1.0, 1.25, 1.5, 2.0].map((rate) => (
              <TouchableOpacity
                key={rate}
                onPress={() => setPlaybackRate(rate)}
                style={[styles.rateBtn, playbackRate === rate && styles.rateBtnActive]}
              >
                <Text style={[styles.rateText, playbackRate === rate && styles.rateTextActive]}>
                  {rate}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Barre de progression visuelle d'avancement de la lecture audio */}
        <View style={styles.playbackProgressTrack}>
          <View style={[styles.playbackProgressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Transcription synchronisée en direct */}
      {segments && segments.length > 0 && (
        <View style={styles.syncBox}>
          <View style={styles.syncHeader}>
            <Text style={styles.syncHeaderTitle}>
              Écoute synchronisée (Transcription en direct)
            </Text>
          </View>
          <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '12px' }}>
            {segments.map((seg, idx) => {
              const isActive = idx === activeSegmentIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeSegmentRef : null}
                  onClick={() => seekToSegment(seg)}
                  style={{
                    backgroundColor: isActive ? '#e0e7ff' : 'transparent',
                    borderLeft: isActive ? '4px solid #4f46e5' : '4px solid transparent',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: isActive ? '#4338ca' : '#94a3b8',
                      marginRight: '10px',
                    }}
                  >
                    [{formatTime(seg.startTime)}]
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      color: isActive ? '#1e1b4b' : '#334155',
                      fontWeight: isActive ? '700' : '400',
                      lineHeight: '1.5',
                    }}
                  >
                    {seg.text || "..."}
                  </span>
                </div>
              );
            })}
          </div>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    width: '100%',
  },
  playerBarContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  speedBox: {
    flexDirection: 'row',
    marginLeft: 10,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 2,
  },
  rateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateBtnActive: {
    backgroundColor: '#6366f1',
  },
  rateText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  rateTextActive: {
    color: '#ffffff',
  },
  playbackProgressTrack: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  playbackProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  syncBox: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  syncHeader: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  syncHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
