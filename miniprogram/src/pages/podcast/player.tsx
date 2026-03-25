import { View, Text, Slider } from '@tarojs/components'
import { useLoad, useRouter, useUnload } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState, useRef } from 'react'
import { request, BASE_URL } from '../../utils/request'
import './player.scss'


interface Podcast {
  id: number
  title: string
  episode?: number
  description?: string
  audio_url: string
  duration?: number
  created_at: string
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PodcastPlayer() {
  const router = useRouter()
  const id = router.params.id
  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const audioRef = useRef<Taro.InnerAudioContext | null>(null)

  useLoad(() => {
    if (!id) return
    loadAndInit(+id)
  })

  useUnload(() => {
    audioRef.current?.stop()
    audioRef.current?.destroy()
  })

  const loadAndInit = async (podcastId: number) => {
    try {
      const data = await request<Podcast>({ url: `/podcasts/${podcastId}`, auth: false })
      setPodcast(data)
      if (data.duration) setTotal(data.duration)
      initAudio(data.audio_url)
    } catch (e) {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }
  }

  const initAudio = (audioUrl: string) => {
    const ctx = Taro.createInnerAudioContext()
    ctx.src = audioUrl.startsWith('http') ? audioUrl : `${BASE_URL}${audioUrl}`
    ctx.onTimeUpdate(() => {
      setCurrent(Math.floor(ctx.currentTime))
      if (ctx.duration && !isNaN(ctx.duration)) setTotal(Math.floor(ctx.duration))
    })
    ctx.onEnded(() => setPlaying(false))
    ctx.onError((_e) => {
      Taro.showToast({ title: '音频加载失败', icon: 'none' })
      setPlaying(false)
    })
    audioRef.current = ctx
  }

  const togglePlay = () => {
    const ctx = audioRef.current
    if (!ctx) return
    if (playing) {
      ctx.pause()
      setPlaying(false)
    } else {
      ctx.play()
      setPlaying(true)
    }
  }

  const handleSeek = (e: any) => {
    const ctx = audioRef.current
    if (!ctx || !total) return
    const seekTo = (e.detail.value / 100) * total
    ctx.seek(seekTo)
    setCurrent(Math.floor(seekTo))
  }

  const skip = (seconds: number) => {
    const ctx = audioRef.current
    if (!ctx) return
    const next = Math.max(0, Math.min(total, current + seconds))
    ctx.seek(next)
    setCurrent(next)
  }

  const progress = total > 0 ? Math.round((current / total) * 100) : 0

  if (!podcast) {
    return (
      <View className='player-loading'>
        <Text className='loading-text'>LOADING...</Text>
      </View>
    )
  }

  return (
    <View className='player-page'>
      <View className='player-cover'>
        <View className='cover-art'>
          <Text className='cover-drc'>DRC</Text>
          <Text className='cover-podcast'>PODCAST</Text>
        </View>
      </View>

      <View className='player-info'>
        {podcast.episode && (
          <Text className='ep-label'>EP {String(podcast.episode).padStart(2, '0')}</Text>
        )}
        <Text className='player-title'>{podcast.title}</Text>
        {podcast.description && (
          <Text className='player-desc'>{podcast.description}</Text>
        )}
      </View>

      <View className='player-progress'>
        <Slider
          value={progress}
          min={0}
          max={100}
          step={1}
          onChange={handleSeek}
          activeColor='#ffffff'
          backgroundColor='#333'
          blockColor='#ffffff'
          blockSize={20}
        />
        <View className='time-row'>
          <Text className='time-text'>{formatTime(current)}</Text>
          <Text className='time-text'>{formatTime(total)}</Text>
        </View>
      </View>

      <View className='player-controls'>
        <View className='ctrl-btn' onClick={() => skip(-15)}>
          <Text className='ctrl-text'>-15</Text>
          <Text className='ctrl-sub'>s</Text>
        </View>
        <View className={`play-main ${playing ? 'playing' : ''}`} onClick={togglePlay}>
          <Text className='play-main-icon'>{playing ? '❚❚' : '▶'}</Text>
        </View>
        <View className='ctrl-btn' onClick={() => skip(30)}>
          <Text className='ctrl-text'>+30</Text>
          <Text className='ctrl-sub'>s</Text>
        </View>
      </View>
    </View>
  )
}
