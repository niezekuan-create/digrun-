import { View, Text, Image, ScrollView } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { useState, useRef } from "react";
import {
	request,
	CLUB_ID_CONFIG,
	normalizeImageUrl,
} from "../../utils/request";
import {
	type ActivitySummary as Activity,
	buildActivitiesUrl,
	dedupeActivities,
	formatActivityStart,
	getActivityListButtonState,
	normalizeActivitySummary,
	parseActivityDistance,
} from "../../utils/activity";
import { getMockActivitiesList } from "../../utils/mockData";
import BottomNav from "../../components/BottomNav/index";
import "./index.scss";

type TabKey = "upcoming" | "ended";

type ActivityListResponse = {
	data: any[];
};

const TAB_LABELS: Record<TabKey, string> = {
	upcoming: "即将开始",
	ended: "已结束",
};
const TAB_STATUSES: Record<TabKey, string[]> = {
	upcoming: ["inprogress", "upcoming"],
	ended: ["offline"],
};

export default function EventsPage() {
	const [tab, setTab] = useState<TabKey>("upcoming");
	const [upcoming, setUpcoming] = useState<Activity[]>([]);
	const [ended, setEnded] = useState<Activity[]>([]);
	const [loadingUpcoming, setLoadingUpcoming] = useState(true);
	const [loadingEnded, setLoadingEnded] = useState(false);
	const loadedEnded = useRef(false);
	const clubId = CLUB_ID_CONFIG;

	useLoad(() => {
		loadTab("upcoming");
	});

	const fetchActivities = async (statuses: string[]) => {
		const groups = await Promise.all(
			statuses.map(async (status) => {
				const res = await request<ActivityListResponse>({
					url: buildActivitiesUrl(clubId, status),
				});
				return Array.isArray(res?.data) ? res.data : [];
			}),
		);
		const merged = groups.reduce<any[]>((acc, group) => acc.concat(group), []);
		return dedupeActivities(merged);
	};

	const loadTab = async (t: TabKey) => {
		if (t === "ended" && loadedEnded.current) return;
		const setLoading = t === "upcoming" ? setLoadingUpcoming : setLoadingEnded;
		const setActivities = t === "upcoming" ? setUpcoming : setEnded;
		setLoading(true);

		try {
			const rawList = await fetchActivities(TAB_STATUSES[t]);
			const data = rawList
				.map(normalizeActivitySummary)
				.filter((it) => !!it.id);
			setActivities(data);
		} catch {
			setActivities(getMockActivitiesList(clubId, t).data as Activity[]);
		} finally {
			setLoading(false);
			if (t === "ended") loadedEnded.current = true;
		}
	};

	const switchTab = (t: TabKey) => {
		if (t === tab) return;
		setTab(t);
		loadTab(t);
	};

	const goDetail = (id: string) => {
		Taro.navigateTo({ url: `/pages/events/detail?activityId=${id}` });
	};

	const renderCard = (activity: Activity, isEnded: boolean) => {
		const poster = normalizeImageUrl(activity.posterUrl);
		const { mmdd, weekday } = formatActivityStart(activity.start);
		const distance = parseActivityDistance(activity.address);
		const { canClick, text: btnText } = getActivityListButtonState(activity);
		const locationLabel = activity.city || "—";

		return (
			<View
				key={activity.id}
				className={`event-item${isEnded ? " event-item-ended" : ""}`}
				onClick={() => goDetail(activity.id)}
			>
				<View className="event-poster-wrap">
					{poster ? (
						<Image
							src={poster}
							className="event-poster"
							mode="aspectFill"
							lazyLoad
						/>
					) : (
						<View className="event-poster placeholder" />
					)}
					{isEnded && (
						<View className="poster-ended-mask">
							<Text className="poster-ended-text">已结束</Text>
						</View>
					)}
				</View>

				<View className="event-info">
					<View className="info-title-row">
						<View className="info-title-block">
							<Text className="info-name">{activity.name}</Text>
							{!!activity.subtitle && (
								<Text className="info-subtitle">{activity.subtitle}</Text>
							)}
						</View>
					</View>

					<View className="info-meta-row">
						<View className="meta-item">
							<Text className="meta-label">DATE</Text>
							<Text className="meta-value">{mmdd}</Text>
							{!!weekday && <Text className="meta-sub">{weekday}</Text>}
						</View>

						<View className="meta-divider" />

						<View className="meta-item flex-2">
							<Text className="meta-label">LOCATION</Text>
							<Text className="meta-value" numberOfLines={1}>
								{locationLabel}
							</Text>
							{!!activity.address && (
								<Text className="meta-sub" numberOfLines={1}>
									{activity.address}
								</Text>
							)}
						</View>

						{!!distance && <View className="meta-divider" />}
						{!!distance && (
							<View className="meta-item">
								<Text className="meta-label">DIST</Text>
								<Text className="meta-value">{distance}</Text>
							</View>
						)}
					</View>

					<View className="info-footer">
						{!isEnded && (
							<View
								className={`footer-btn${canClick ? "" : " disabled"}`}
								onClick={(e) => {
									e.stopPropagation();
									if (canClick) goDetail(activity.id);
								}}
							>
								<Text className="footer-btn-text">{btnText}</Text>
							</View>
						)}
					</View>
				</View>
			</View>
		);
	};

	const isEndedTab = tab === "ended";
	const activities = isEndedTab ? ended : upcoming;
	const loading = isEndedTab ? loadingEnded : loadingUpcoming;

	return (
		<View className="events-page">
			<View className="events-header">
				<Text className="events-title">EVENTS</Text>
				<View className="events-tabs">
					{(["upcoming", "ended"] as TabKey[]).map((tabKey) => (
						<View
							key={tabKey}
							className={`events-tab${tab === tabKey ? " active" : ""}`}
							onClick={() => switchTab(tabKey)}
						>
							<Text className="events-tab-text">{TAB_LABELS[tabKey]}</Text>
						</View>
					))}
				</View>
			</View>

			{loading ? (
				<View className="loading">
					<Text className="loading-text">LOADING...</Text>
				</View>
			) : activities.length === 0 ? (
				<View className="loading">
					<Text className="loading-text">暂无活动</Text>
				</View>
			) : (
				<ScrollView scrollY className="events-scroll">
					{activities.map((activity) => renderCard(activity, isEndedTab))}
				</ScrollView>
			)}
			<BottomNav current="events" />
		</View>
	);
}
