import { View, Text, ScrollView, Image, Input } from "@tarojs/components";
import {
	useLoad,
	useRouter,
	useShareAppMessage,
	useShareTimeline,
} from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { request, normalizeImageUrl, cleanText } from "../../utils/request";
import {
	type MiniActivityDisplayStatus,
	formatDateShort,
	getActivityApplyRange,
	getActivityCtaState,
	getActivityDates,
	getActivityTimeRange,
	normalizeActivityDetail,
} from "../../utils/activity";
import { getMockActivityDetail } from "../../utils/mockData";
import { isLoggedIn, getUserInfo } from "../../utils/auth";
import "./detail.scss";

interface ActivityDetail {
	id: string;
	club?: {
		id: string;
		name: string;
		avatar?: string;
	};
	name: string;
	subtitle?: string;
	description?: string;
	start?: number;
	end?: number;
	applyStart?: number;
	applyEnd?: number;
	posterUrl?: string;
	address?: string;
	route?: string;
	count?: number;
	joinCount?: number;
	points?: number;
	appliable?: boolean;
	applyText?: string;
	timeStr?: string;
	btnText?: string;
	btnStatus?: boolean;
	isSignedUp?: boolean;
	isChecked?: boolean;
	requireSize?: boolean;
	requireXhs?: boolean;
	displayStatus?: MiniActivityDisplayStatus | string;
}

type ActivityDetailResponse = {
	data: ActivityDetail;
	err: boolean;
};

type SignupFormState = {
	name: string;
	mobile: string;
	clothingSize: string;
	shoeSize: string;
	xhsLink: string;
};

export default function EventDetailPage() {
	const router = useRouter();
	const [activity, setActivity] = useState<ActivityDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [topPadding, setTopPadding] = useState(0);
	const [signupVisible, setSignupVisible] = useState(false);
	const [signupSubmitting, setSignupSubmitting] = useState(false);
	const [signupForm, setSignupForm] = useState<SignupFormState>({
		name: "",
		mobile: "",
		clothingSize: "",
		shoeSize: "",
		xhsLink: "",
	});

	const activityId = router.params.activityId || router.params.id;

	useShareAppMessage(() => {
		const id = String(activityId || "");
		const title = activity?.name || "活动详情";
		const imageUrl = normalizeImageUrl(activity?.posterUrl) || undefined;
		return {
			title,
			path: id
				? `/pages/events/detail?activityId=${encodeURIComponent(id)}`
				: "/pages/events/index",
			imageUrl,
		};
	});

	useShareTimeline(() => {
		const id = String(activityId || "");
		const title = activity?.name || "活动详情";
		const imageUrl = normalizeImageUrl(activity?.posterUrl) || undefined;
		return {
			title,
			query: id ? `activityId=${encodeURIComponent(id)}` : "",
			imageUrl,
		};
	});

	useLoad(() => {
		try {
			const sys = Taro.getSystemInfoSync();
			const menu = Taro.getMenuButtonBoundingClientRect?.();
			const base = Math.max(sys?.statusBarHeight || 0, menu?.top || 0);
			setTopPadding(base ? base + 8 : 44);
		} catch (e) {
			setTopPadding(44);
		}
		if (!activityId) return;
		loadData(String(activityId));
	});

	const loadData = async (id: string) => {
		try {
			const res = await request<ActivityDetailResponse>({
				url: `/api/mini/activities/detail/${id}`,
			});
			setActivity(normalizeActivityDetail<ActivityDetail>((res as any)?.data));
		} catch (e) {
			const mock = getMockActivityDetail(id);
			if (mock) setActivity(normalizeActivityDetail<ActivityDetail>(mock.data));
		} finally {
			setLoading(false);
		}
	};

	const openSignupModal = () => {
		const user = getUserInfo();
		setSignupForm((prev) => ({
			...prev,
			mobile: prev.mobile || user?.phone || "",
		}));
		setSignupVisible(true);
	};

	const closeSignupModal = () => {
		if (signupSubmitting) return;
		setSignupVisible(false);
	};

	const updateSignupField = (key: keyof typeof signupForm, val: string) => {
		setSignupForm((prev) => ({ ...prev, [key]: val }));
	};

	const submitSignup = async () => {
		if (!activity?.id) return;
		if (!isLoggedIn()) {
			Taro.showToast({ title: "请先登录", icon: "none" });
			setTimeout(() => Taro.redirectTo({ url: "/pages/login/index" }), 600);
			return;
		}

		const name = signupForm.name.trim();
		const mobile = signupForm.mobile.trim();
		const clothingSize = signupForm.clothingSize.trim();
		const shoeSize = signupForm.shoeSize.trim();
		const rawXhsLink = signupForm.xhsLink.trim();
		const xhsLink = rawXhsLink ? cleanText(rawXhsLink) : "";
		const requireSize = !!activity.requireSize;
		const requireXhs = !!activity.requireXhs;

		if (!name) return Taro.showToast({ title: "请填写姓名", icon: "none" });
		if (!/^1\d{10}$/.test(mobile))
			return Taro.showToast({ title: "请填写正确手机号", icon: "none" });
		if (requireSize && !clothingSize)
			return Taro.showToast({ title: "请填写衣服尺码", icon: "none" });
		if (requireSize && !shoeSize)
			return Taro.showToast({ title: "请填写鞋码", icon: "none" });
		if (requireXhs && !xhsLink)
			return Taro.showToast({ title: "请填写小红书链接", icon: "none" });

		setSignupSubmitting(true);
		try {
			const payload: any = { name, mobile };
			if (clothingSize) payload.clothingSize = clothingSize;
			if (shoeSize) payload.shoeSize = shoeSize;
			if (xhsLink) payload.xhsLink = xhsLink;

			const res: any = await request<any>({
				url: `/api/mini/activities/join/${activity.id}`,
				method: "POST",
				data: payload,
			});
			if (res?.err) {
				Taro.showToast({
					title: res?.msg || res?.message || "报名失败",
					icon: "none",
				});
				return;
			}
			Taro.showToast({ title: "报名成功", icon: "success" });
			setSignupVisible(false);
			setActivity((prev) => (prev ? { ...prev, isSignedUp: true } : prev));
			loadData(activity.id);
		} catch (e) {
			Taro.showToast({ title: "报名失败", icon: "none" });
		} finally {
			setSignupSubmitting(false);
		}
	};

	const openRoute = async () => {
		const url = cleanText(activity?.route);
		if (!url) return;
		try {
			await Taro.setClipboardData({ data: url });
			Taro.showToast({ title: "链接已复制", icon: "none" });
		} catch (e) {
			Taro.showToast({ title: "复制失败", icon: "none" });
		}
	};

	if (loading) {
		return (
			<View className="detail-loading">
				<Text className="detail-loading-text">LOADING...</Text>
			</View>
		);
	}

	if (!activity) {
		return (
			<View className="detail-loading">
				<Text className="detail-loading-text">活动不存在</Text>
			</View>
		);
	}

	const { startDate, endDate, applyStartDate, applyEndDate } =
		getActivityDates(activity);
	const timeRange = getActivityTimeRange(activity, startDate, endDate);
	const applyRange = getActivityApplyRange(
		activity,
		applyStartDate,
		applyEndDate,
	);
	const joinCount = activity.joinCount ?? 0;
	const capacity = activity.count ?? 0;
	const points = activity.points ?? 0;
	const ctaState = getActivityCtaState(activity);
	const clubAvatar = normalizeImageUrl(activity.club?.avatar);
	const clubName = activity.club?.name || "DIG RUNNING CLUB";

	return (
		<View className="detail-page">
			{/* Topbar */}
			<View className="detail-topbar" style={{ paddingTop: `${topPadding}px` }}>
				<View className="topbar-back" onClick={() => Taro.navigateBack()}>
					<Text className="topbar-back-icon">←</Text>
				</View>
			</View>

			<ScrollView scrollY className="detail-scroll">
				{/* Header */}
				<View className="detail-header">
					<View className="detail-club-row">
						{clubAvatar ? (
							<Image
								src={clubAvatar}
								className="detail-club-avatar"
								mode="aspectFill"
								lazyLoad
							/>
						) : (
							<View className="detail-club-avatar-placeholder">
								<Text className="detail-club-avatar-char">D</Text>
							</View>
						)}
						<Text className="detail-club-name">{clubName}</Text>
					</View>

					<Text className="detail-title">{activity.name}</Text>
					{activity.subtitle && (
						<Text className="detail-subtitle">{activity.subtitle}</Text>
					)}

					{/* Time block */}
					<View className="detail-time-block">
						{startDate ? (
							<>
								<View className="time-block-top">
									<Text className="time-block-date">
										{formatDateShort(startDate)}
									</Text>
									<Text className="time-block-year">
										{startDate.getFullYear()}
									</Text>
								</View>
								<Text className="time-block-range">{timeRange || "—"}</Text>
							</>
						) : (
							<Text className="time-block-range">
								{activity.timeStr || "—"}
							</Text>
						)}
					</View>

					{activity.address ? (
						<View className="detail-site-row">
							<Text className="detail-site-label">SITE</Text>
							<Text className="detail-site-val">{activity.address}</Text>
						</View>
					) : null}
				</View>

				<View className="detail-sep" />

				{/* Description */}
				{activity.description ? (
					<View className="detail-section">
						<Text className="section-label">活动描述</Text>
						<Text className="section-body">{activity.description}</Text>
					</View>
				) : null}

				{/* Apply time */}
				<View className="detail-section">
					<Text className="section-label">报名时间</Text>
					<Text className="section-body">
						{applyRange || activity.applyText || "—"}
					</Text>
				</View>

				{/* Participants */}
				<View className="detail-section">
					<Text className="section-label">参与人数</Text>
					<Text className="section-body">
						{capacity ? `${joinCount} / ${capacity} 人` : `${joinCount} 人`}
					</Text>
				</View>

				{/* Points */}
				{points > 0 && (
					<View className="detail-section">
						<Text className="section-label">活动积分</Text>
						<View className="points-row">
							<Text className="points-num">{points}</Text>
							<Text className="points-unit">分</Text>
						</View>
						<Text className="points-hint">完成活动可获得</Text>
					</View>
				)}

				{/* Route */}
				{activity.route ? (
					<View className="detail-section" onClick={openRoute}>
						<Text className="section-label">活动路线</Text>
						<Text className="section-body route-val">
							{activity.address || "查看路线"}
						</Text>
						<Text className="route-hint">点击复制链接 →</Text>
					</View>
				) : null}

				<View className="detail-footer-spacer" />
			</ScrollView>

			{/* Bottom CTA */}
			<View className="detail-bottombar">
				<View
					className={`bottom-cta${ctaState.enabled ? "" : " disabled"}`}
					onClick={
						ctaState.enabled
							? () => {
									if (ctaState.action === "signup") {
										openSignupModal();
										return;
									}
									if (ctaState.action === "checkin") {
										Taro.navigateTo({
											url: `/pages/checkin/index?activityId=${activity.id}`,
										});
									}
								}
							: undefined
					}
				>
					<Text className="bottom-cta-text">{ctaState.text}</Text>
				</View>
			</View>

			{signupVisible && (
				<View className="signup-mask" onClick={closeSignupModal}>
					<View className="signup-modal" onClick={(e) => e.stopPropagation()}>
						<Text className="signup-title">填写报名信息</Text>

						<View className="signup-field">
							<Text className="signup-label">姓名</Text>
							<Input
								className="signup-input"
								value={signupForm.name}
								placeholder="请输入姓名"
								placeholderClass="signup-placeholder"
								onInput={(e) =>
									updateSignupField("name", String(e.detail.value || ""))
								}
							/>
						</View>

						<View className="signup-field">
							<Text className="signup-label">手机</Text>
							<Input
								className="signup-input"
								value={signupForm.mobile}
								placeholder="请输入手机号"
								placeholderClass="signup-placeholder"
								type="number"
								maxlength={11}
								onInput={(e) =>
									updateSignupField("mobile", String(e.detail.value || ""))
								}
							/>
						</View>

						<View className="signup-field">
							<Text className="signup-label">
								衣服尺码{activity.requireSize ? "（必填）" : "（选填）"}
							</Text>
							<Input
								className="signup-input"
								value={signupForm.clothingSize}
								placeholder="例如：S/M/L/XL"
								placeholderClass="signup-placeholder"
								onInput={(e) =>
									updateSignupField(
										"clothingSize",
										String(e.detail.value || ""),
									)
								}
							/>
						</View>

						<View className="signup-field">
							<Text className="signup-label">
								鞋码{activity.requireSize ? "（必填）" : "（选填）"}
							</Text>
							<Input
								className="signup-input"
								value={signupForm.shoeSize}
								placeholder="例如：39/40/41"
								placeholderClass="signup-placeholder"
								onInput={(e) =>
									updateSignupField("shoeSize", String(e.detail.value || ""))
								}
							/>
						</View>

						<View className="signup-field">
							<Text className="signup-label">
								小红书链接{activity.requireXhs ? "（必填）" : "（选填）"}
							</Text>
							<Input
								className="signup-input"
								value={signupForm.xhsLink}
								placeholder="https://xhslink.com/m/xxxx"
								placeholderClass="signup-placeholder"
								onInput={(e) =>
									updateSignupField("xhsLink", String(e.detail.value || ""))
								}
							/>
						</View>

						<View className="signup-actions">
							<View className="signup-btn ghost" onClick={closeSignupModal}>
								<Text className="signup-btn-text">取消</Text>
							</View>
							<View
								className={`signup-btn primary${signupSubmitting ? " disabled" : ""}`}
								onClick={signupSubmitting ? undefined : submitSignup}
							>
								<Text className="signup-btn-text">
									{signupSubmitting ? "提交中" : "报名"}
								</Text>
							</View>
						</View>
					</View>
				</View>
			)}
		</View>
	);
}
