import { View, Text, Image, Button } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { isLoggedIn, login, setUserInfo } from "../../utils/auth";
import { CLUB_ID_CONFIG, request } from "../../utils/request";
import "./index.scss";

export default function LoginPage() {
	const [loading, setLoading] = useState(false);
	const [agreed, setAgreed] = useState(false);

	useLoad(() => {
		if (isLoggedIn()) {
			Taro.redirectTo({ url: "/pages/events/index" });
		}
	});

	const doLogin = async (wxLoginCode: string) => {
		if (loading) return;
		setLoading(true);
		try {
			await login(wxLoginCode);
			const info: any = await request<any>({
				url: `/api/mini/user/info?clubId=${CLUB_ID_CONFIG}`,
			});
			if (info?.err)
				throw new Error(info?.msg || info?.message || "user_info_failed");
			const profile = info?.data;
			const u = profile?.user || {};
			if (u?.id) {
				setUserInfo({
					id: u?.id ?? "",
					nickname: u?.username || "",
					username: u?.username || "",
					avatar: u?.avatar || "",
					is_admin: !!profile?.isAdmin,
				} as any);
			}
			Taro.redirectTo({ url: "/pages/events/index" });
		} catch (err: any) {
			const msg = String(err?.message || "");
			Taro.showToast({ title: msg || "登录失败，请重试", icon: "none" });
		} finally {
			setLoading(false);
		}
	};

	const handleGetPhoneNumber = async (e: any) => {
		const code = e?.detail?.code;
		if (!code) {
			Taro.showToast({ title: "未授权手机号", icon: "none" });
			return;
		}
		await doLogin(code);
	};

	const toggleAgree = () => {
		setAgreed((prev) => !prev);
	};

	const fetchAgreementUrl = async (key: "agreement" | "privacy") => {
		const res: any = await request<any>({
			url: `/api/commons/url/${key}`,
			auth: false,
		});
		if (res?.err)
			throw new Error(res?.msg || res?.message || "fetch_url_failed");

		const raw =
			(typeof res?.data === "string" ? res.data : "") ||
			(typeof res?.data?.url === "string" ? res.data.url : "") ||
			(typeof res?.url === "string" ? res.url : "") ||
			(typeof res?.data?.data === "string" ? res.data.data : "") ||
			(typeof res?.data?.data?.url === "string" ? res.data.data.url : "");
		const url = String(raw || "")
			.replace(/`/g, "")
			.trim();
		if (!url) throw new Error("empty_url");
		return url;
	};

	const openAgreement = async (
		key: "agreement" | "privacy",
		title: string,
		fallbackToPrivacyContract?: boolean,
	) => {
		try {
			const url = await fetchAgreementUrl(key);
			Taro.navigateTo({
				url: `/pages/webview/index?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
			});
		} catch (err: any) {
			if (fallbackToPrivacyContract) {
				const api = Taro as any;
				if (typeof api.openPrivacyContract === "function") {
					try {
						await api.openPrivacyContract();
						return;
					} catch {}
				}
			}
			Taro.showToast({ title: "获取协议失败", icon: "none" });
		}
	};

	const openUserAgreement = async (e?: any) => {
		e?.stopPropagation?.();
		await openAgreement("agreement", "用户协议");
	};

	const openPrivacyPolicy = async (e?: any) => {
		e?.stopPropagation?.();
		await openAgreement("privacy", "隐私协议", true);
	};

	const disabled = loading || !agreed;

	return (
		<View className="splash-page">
			{/* 全屏背景图 */}
			<Image
				src={require("../../assets/images/splash.jpg")}
				className="splash-bg"
				mode="aspectFill"
				lazyLoad
			/>

			{/* 暗色遮罩 */}
			<View className="splash-overlay" />

			{/* 内容层 */}
			<View className="splash-content">
				{/* 中央 Logo */}
				<View className="logo-wrap">
					<Image
						src={require("../../assets/images/logo.png")}
						className="splash-logo"
						mode="aspectFit"
						lazyLoad
					/>
				</View>

				{/* 底部登录区 */}
				<View className="splash-bottom">
					<Button
						className={`splash-btn${loading ? " loading" : ""}${disabled ? " disabled" : ""}`}
						openType="getPhoneNumber"
						onGetPhoneNumber={handleGetPhoneNumber}
						disabled={disabled}
					>
						<Text className="splash-btn-text">
							{loading ? "登录中..." : "手机号快捷登录"}
						</Text>
					</Button>
					<View className="agree-row" onClick={toggleAgree}>
						<View className={`agree-box${agreed ? " checked" : ""}`} />
						<Text className="agree-text">
							我已阅读并同意
							<Text className="agree-link" onClick={openUserAgreement}>
								《用户协议》
							</Text>
							和
							<Text className="agree-link" onClick={openPrivacyPolicy}>
								《隐私协议》
							</Text>
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
