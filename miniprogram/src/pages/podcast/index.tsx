import { View, Text, ScrollView, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";
import "./index.scss";
import BottomNav from "../../components/BottomNav/index";

interface Podcast {
	id: number;
	title: string;
	episode?: number;
	description?: string;
	audio_url: string;
	cover_url?: string;
	duration?: number;
	created_at: string;
}

function formatDuration(seconds?: number): string {
	if (!seconds) return "--:--";
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function PodcastPage() {
	const [podcasts] = useState<Podcast[]>([]);
	const [loading] = useState(false);

	const goPlayer = (podcast: Podcast) => {
		Taro.navigateTo({ url: `/pages/podcast/player?id=${podcast.id}` });
	};

	return (
		<View className="podcast-page">
			<View className="page-header">
				<Text className="header-title">PODCAST</Text>
				<Text className="header-sub">DIG RUNNING CLUB 播客</Text>
			</View>

			{loading ? (
				<View className="loading">
					<Text className="loading-text">LOADING...</Text>
				</View>
			) : podcasts.length === 0 ? (
				<View className="empty">
					<Text className="empty-title">即将上线</Text>
					<Text className="empty-sub">DIG RUNNING CLUB 播客节目敬请期待</Text>
				</View>
			) : (
				<ScrollView scrollY className="podcast-list">
					{podcasts.map((p, i) => (
						<View
							key={p.id}
							className="podcast-card"
							onClick={() => goPlayer(p)}
						>
							<View className="podcast-cover-wrap">
								{p.cover_url ? (
									<Image
										src={p.cover_url}
										className="podcast-cover-thumb"
										mode="aspectFill"
										lazyLoad
									/>
								) : (
									<View className="podcast-cover-placeholder">
										<Text className="podcast-ep-num">
											{p.episode
												? `EP${String(p.episode).padStart(2, "0")}`
												: String(i + 1).padStart(2, "0")}
										</Text>
									</View>
								)}
							</View>

							<View className="podcast-info">
								{p.episode && (
									<Text className="podcast-ep-label">EP {p.episode}</Text>
								)}
								<Text className="podcast-title">{p.title}</Text>
								{p.description && (
									<Text className="podcast-desc">{p.description}</Text>
								)}
								<View className="podcast-meta">
									<Text className="meta-date">{formatDate(p.created_at)}</Text>
									{p.duration && (
										<Text className="meta-dur">
											{formatDuration(p.duration)}
										</Text>
									)}
								</View>
							</View>

							<View className="play-btn">
								<Text className="play-icon">▶</Text>
							</View>
						</View>
					))}
				</ScrollView>
			)}
			<BottomNav current="podcast" />
		</View>
	);
}
