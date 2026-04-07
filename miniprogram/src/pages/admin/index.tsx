import {
	View,
	Text,
	Input,
	Textarea,
	ScrollView,
	Image,
	Picker,
} from "@tarojs/components";
import { useLoad } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { useState } from "react";
import { request } from "../../utils/request";
import { getToken, BASE_URL } from "../../utils/request";
import { getMockAdminEvents } from "../../utils/mockData";
import "./index.scss";

type Tab = "scan" | "event" | "podcast" | "mall" | "users";

interface CheckinResult {
	message: string;
	registration: {
		status: string;
		user?: { nickname: string };
		event?: { title: string };
		pace?: string;
		distance?: string;
	};
}

interface EventForm {
	title: string;
	signup_start: string;
	signup_end: string;
	event_start: string;
	event_end: string;
	location: string;
	route: string;
	description: string;
	max_people: string;
	cover_image: string;
}
interface AdminEvent {
	id: number;
	title: string;
	date: string;
	is_active: boolean;
	status: string;
	registration_count?: number;
	location?: string;
	route?: string;
	description?: string;
	max_people?: number;
	cover_image?: string;
	form_config?: any;
	signup_start_time?: string;
	signup_end_time?: string;
	event_start_time?: string;
	event_end_time?: string;
}
interface PodcastForm {
	title: string;
	episode: string;
	description: string;
	cover_url: string;
}
interface ProductForm {
	name: string;
	points_cost: string;
	stock: string;
	product_type: string;
	size_options: string;
}
interface Product {
	id: number;
	name: string;
	points_cost: number;
	stock: number;
	status: string;
	product_type?: string;
	size_options?: string[];
}
interface MallOrder {
	id: number;
	points_spent: number;
	status: string;
	size?: string;
	delivery_type?: string;
	address_name?: string;
	address_phone?: string;
	address_detail?: string;
	created_at: string;
	product?: { name: string };
	user?: { nickname: string };
}
interface AdminUser {
	id: number;
	nickname: string;
	is_admin: boolean;
	created_at: string;
	wechat_openid: string;
}
interface UserPointsItem {
	id: number;
	user_id: number;
	points_balance: number;
	points_total: number;
	user?: { id: number; nickname: string };
}
interface PointsTx {
	id: number;
	points_change: number;
	source: string;
	description: string;
	reason?: string;
	created_at: string;
}
interface FormFieldConfig {
	key: string;
	label: string;
	enabled: boolean;
	required: boolean;
}
interface RegItem {
	id: number;
	status: string;
	created_at: string;
	name?: string;
	phone?: string;
	pace?: string;
	distance?: string;
	form_data?: Record<string, any>;
	user?: { nickname: string };
	event?: { title: string; id: number };
}

const EMPTY_EVENT: EventForm = {
	title: "",
	signup_start: "",
	signup_end: "",
	event_start: "",
	event_end: "",
	location: "",
	route: "",
	description: "",
	max_people: "30",
	cover_image: "",
};

const getDatePart = (iso: string) => (iso ? iso.slice(0, 10) : "");
const getTimePart = (iso: string) => (iso ? iso.slice(11, 16) : "");
const combineDateTime = (date: string, time: string) =>
	date && time ? `${date}T${time}:00` : "";
const getDefaultDateTimes = () => {
	const now = new Date();
	const eventStart = new Date(now);
	eventStart.setDate(eventStart.getDate() + 1);
	eventStart.setHours(8, 0, 0, 0);
	const eventEnd = new Date(eventStart);
	eventEnd.setHours(10, 0, 0, 0);
	const signupEnd = new Date(eventStart);
	signupEnd.setHours(7, 30, 0, 0);
	const iso = (d: Date) =>
		`${d.toISOString().slice(0, 10)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
	return {
		signupStartIso: iso(now),
		signupEndIso: iso(signupEnd),
		eventStartIso: iso(eventStart),
		eventEndIso: iso(eventEnd),
	};
};
const EMPTY_PODCAST: PodcastForm = {
	title: "",
	episode: "",
	description: "",
	cover_url: "",
};
const EMPTY_PRODUCT: ProductForm = {
	name: "",
	points_cost: "",
	stock: "",
	product_type: "normal",
	size_options: "",
};

const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
	{ key: "name", label: "姓名", enabled: true, required: true },
	{ key: "phone", label: "电话", enabled: true, required: true },
	{ key: "wechat", label: "微信号", enabled: false, required: false },
	{ key: "city", label: "城市", enabled: false, required: false },
	{ key: "pace", label: "配速", enabled: true, required: false },
	{ key: "distance", label: "跑步距离", enabled: false, required: false },
	{ key: "bag_storage", label: "是否存包", enabled: false, required: false },
	{ key: "supply", label: "是否补给", enabled: false, required: false },
	{ key: "coffee", label: "是否购买咖啡", enabled: false, required: false },
	{
		key: "social_link",
		label: "社交平台链接",
		enabled: false,
		required: false,
	},
];

export default function AdminPage() {
	const [tab, setTab] = useState<Tab>("scan");
	const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
	const [scanning, setScanning] = useState(false);
	const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT);
	const [podcastForm, setPodcastForm] = useState<PodcastForm>(EMPTY_PODCAST);
	const [audioFile, setAudioFile] = useState<{
		path: string;
		name: string;
	} | null>(null);
	const [uploading, setUploading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formFields, setFormFields] = useState<FormFieldConfig[]>(
		DEFAULT_FORM_FIELDS.map((f) => ({ ...f })),
	);
	const [coverLocalPath, setCoverLocalPath] = useState("");
	const [uploadingCover, setUploadingCover] = useState(false);
	const [podcastCoverLocalPath, setPodcastCoverLocalPath] = useState("");
	const [uploadingPodcastCover, setUploadingPodcastCover] = useState(false);
	const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
	const [products, setProducts] = useState<Product[]>([]);
	const [mallOrders, setMallOrders] = useState<MallOrder[]>([]);
	const [mallTab, setMallTab] = useState<"products" | "orders">("products");
	const [mallLoading, setMallLoading] = useState(false);
	const [creatingProduct, setCreatingProduct] = useState(false);
	const [eventRegsFilter, setEventRegsFilter] = useState<
		"pending" | "approved" | "all"
	>("pending");
	const [expandedRegId, setExpandedRegId] = useState<number | null>(null);
	const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);
	const [eventsLoading, setEventsLoading] = useState(false);
	const [eventSubTab, setEventSubTab] = useState<"list" | "create" | "edit">(
		"list",
	);
	const [editingEventId, setEditingEventId] = useState<number | null>(null);
	const [editingHasRegs, setEditingHasRegs] = useState(false);
	const [editingOriginalDate, setEditingOriginalDate] = useState("");
	// Per-event registration drill-down
	const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
	const [eventRegs, setEventRegs] = useState<RegItem[]>([]);
	const [eventRegsLoading, setEventRegsLoading] = useState(false);
	// Users
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [usersLoading, setUsersLoading] = useState(false);
	// Points management
	const [pointsUsers, setPointsUsers] = useState<UserPointsItem[]>([]);
	const [pointsLoading, setPointsLoading] = useState(false);
	const [pointsSearch, setPointsSearch] = useState("");
	const [selectedPointsUser, setSelectedPointsUser] =
		useState<UserPointsItem | null>(null);
	const [userTxs, setUserTxs] = useState<PointsTx[]>([]);
	const [adjustAmount, setAdjustAmount] = useState("");
	const [adjustReason, setAdjustReason] = useState("");
	const [adjusting, setAdjusting] = useState(false);

	useLoad(() => {});

	// ── Mall ──
	const loadMallData = async () => {
		setMallLoading(true);
		try {
			const [prods, orders] = await Promise.all([
				request<Product[]>({ url: "/points/admin/products" }),
				request<MallOrder[]>({ url: "/points/admin/orders" }),
			]);
			setProducts(prods);
			setMallOrders(orders);
		} catch (e) {
		} finally {
			setMallLoading(false);
		}
	};

	const setPField2 = (key: keyof ProductForm) => (e: any) =>
		setProductForm((f) => ({ ...f, [key]: e.detail.value }));

	const handleCreateProduct = async () => {
		if (!productForm.name || !productForm.points_cost || !productForm.stock) {
			Taro.showToast({ title: "请填写完整", icon: "none" });
			return;
		}
		if (creatingProduct) return;
		setCreatingProduct(true);
		try {
			const needsSize =
				productForm.product_type === "apparel" ||
				productForm.product_type === "shoes";
			const defaultSizes =
				productForm.product_type === "apparel"
					? ["S", "M", "L", "XL"]
					: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
			const size_options = needsSize
				? productForm.size_options.trim()
					? productForm.size_options
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean)
					: defaultSizes
				: undefined;
			await request({
				url: "/points/admin/products",
				method: "POST",
				data: {
					name: productForm.name,
					points_cost: parseInt(productForm.points_cost),
					stock: parseInt(productForm.stock),
					product_type: productForm.product_type,
					size_options,
				},
			});
			Taro.showToast({ title: "商品已创建", icon: "success" });
			setProductForm(EMPTY_PRODUCT);
			loadMallData();
		} catch (e) {
		} finally {
			setCreatingProduct(false);
		}
	};

	const handleToggleProduct = async (product: Product) => {
		const newStatus = product.status === "active" ? "inactive" : "active";
		try {
			await request({
				url: `/points/admin/products/${product.id}`,
				method: "PATCH",
				data: { status: newStatus },
			});
			loadMallData();
		} catch (e) {}
	};

	const handleDeleteProduct = (product: Product) => {
		Taro.showModal({
			title: "删除商品",
			content: `确认删除「${product.name}」？`,
			confirmText: "删除",
			cancelText: "取消",
			success: async (res) => {
				if (!res.confirm) return;
				try {
					await request({
						url: `/points/admin/products/${product.id}`,
						method: "DELETE",
					});
					loadMallData();
				} catch (e) {}
			},
		});
	};

	const handleUpdateOrderStatus = async (orderId: number, status: string) => {
		try {
			await request({
				url: `/points/admin/orders/${orderId}`,
				method: "PATCH",
				data: { status },
			});
			loadMallData();
		} catch (e) {}
	};

	// ── Events ──
	const loadAdminEvents = async () => {
		setEventsLoading(true);
		try {
			const data = await request<AdminEvent[]>({ url: "/events/admin/list" });
			setAdminEvents(data);
		} catch (e: any) {
			// API 不可用时使用 mock 数据（dev 模式）
			setAdminEvents(getMockAdminEvents() as AdminEvent[]);
		} finally {
			setEventsLoading(false);
		}
	};

	const handleSetOffline = (ev: AdminEvent) => {
		Taro.showModal({
			title: "下架活动",
			content: `确认下架「${ev.title}」？\n下架后前端不再展示，已报名用户仍可查看。`,
			confirmText: "下架",
			cancelText: "取消",
			confirmColor: "#f5a623",
			success: async (res) => {
				if (!res.confirm) return;
				try {
					await request({ url: `/events/${ev.id}/offline`, method: "PATCH" });
					Taro.showToast({ title: "已下架", icon: "success" });
					loadAdminEvents();
				} catch (e: any) {
					Taro.showToast({ title: e?.message || "操作失败", icon: "none" });
				}
			},
		});
	};

	const handleEditEvent = (ev: AdminEvent) => {
		const fields: FormFieldConfig[] = ev.form_config?.fields
			? DEFAULT_FORM_FIELDS.map((def) => {
					const saved = ev.form_config.fields.find(
						(f: FormFieldConfig) => f.key === def.key,
					);
					return saved
						? { ...def, enabled: saved.enabled, required: saved.required }
						: { ...def };
				})
			: DEFAULT_FORM_FIELDS.map((f) => ({ ...f }));

		setEventForm({
			title: ev.title,
			signup_start: ev.signup_start_time || "",
			signup_end: ev.signup_end_time || "",
			event_start: ev.event_start_time || ev.date || "",
			event_end: ev.event_end_time || "",
			location: ev.location || "",
			route: ev.route || "",
			description: ev.description || "",
			max_people: String(ev.max_people || 30),
			cover_image: ev.cover_image || "",
		});
		setFormFields(fields);
		setCoverLocalPath(ev.cover_image ? `${BASE_URL}${ev.cover_image}` : "");
		setEditingEventId(ev.id);
		setEditingHasRegs((ev.registration_count ?? 0) > 0);
		setEditingOriginalDate(ev.event_start_time || ev.date);
		setEventSubTab("edit");
	};

	const handleUpdateEvent = async () => {
		if (!editingEventId) return;
		if (
			!eventForm.title ||
			!eventForm.event_start ||
			!eventForm.signup_start ||
			!eventForm.signup_end ||
			!eventForm.location ||
			!eventForm.route
		) {
			Taro.showToast({ title: "请填写必填项", icon: "none" });
			return;
		}
		if (submitting) return;

		const dateChanged = eventForm.event_start !== editingOriginalDate;

		const doUpdate = async () => {
			setSubmitting(true);
			try {
				await request({
					url: `/events/${editingEventId}`,
					method: "PATCH",
					data: {
						title: eventForm.title,
						date: eventForm.event_start,
						signup_start_time: eventForm.signup_start || undefined,
						signup_end_time: eventForm.signup_end || undefined,
						event_start_time: eventForm.event_start || undefined,
						event_end_time: eventForm.event_end || undefined,
						location: eventForm.location,
						route: eventForm.route,
						description: eventForm.description || "暂无详情",
						max_people: parseInt(eventForm.max_people) || 30,
						cover_image: eventForm.cover_image || undefined,
						form_config: { fields: formFields },
					},
				});
			} catch (e: any) {
				// dev 模式：真实接口不可用时本地模拟更新
				if (process.env.NODE_ENV !== "production") {
					setAdminEvents((prev) =>
						prev.map((ev) =>
							ev.id === editingEventId
								? {
										...ev,
										title: eventForm.title,
										location: eventForm.location,
										route: eventForm.route,
										description: eventForm.description,
										max_people: parseInt(eventForm.max_people) || 30,
										event_start_time: eventForm.event_start,
										signup_start_time: eventForm.signup_start,
										signup_end_time: eventForm.signup_end,
									}
								: ev,
						),
					);
				} else {
					Taro.showToast({ title: e?.message || "更新失败", icon: "none" });
					return;
				}
			} finally {
				setSubmitting(false);
			}
			Taro.showToast({ title: "活动已更新", icon: "success" });
			setEventSubTab("list");
			setEditingEventId(null);
			setEventForm(EMPTY_EVENT);
			setCoverLocalPath("");
			setFormFields(DEFAULT_FORM_FIELDS.map((f) => ({ ...f })));
		};

		if (dateChanged && editingHasRegs) {
			Taro.showModal({
				title: "修改活动时间",
				content: "该活动已有报名用户，修改时间可能影响用户安排，是否确认修改？",
				confirmText: "确认修改",
				cancelText: "取消",
				confirmColor: "#f5a623",
				success: async (res) => {
					if (res.confirm) await doUpdate();
				},
			});
		} else {
			await doUpdate();
		}
	};

	const handleCopyEvent = (ev: AdminEvent) => {
		const fields: FormFieldConfig[] = ev.form_config?.fields
			? DEFAULT_FORM_FIELDS.map((def) => {
					const saved = ev.form_config.fields.find(
						(f: FormFieldConfig) => f.key === def.key,
					);
					return saved
						? { ...def, enabled: saved.enabled, required: saved.required }
						: { ...def };
				})
			: DEFAULT_FORM_FIELDS.map((f) => ({ ...f }));

		setEventForm({
			title: `${ev.title}（副本）`,
			signup_start: ev.signup_start_time || "",
			signup_end: ev.signup_end_time || "",
			event_start: ev.event_start_time || ev.date || "",
			event_end: ev.event_end_time || "",
			location: ev.location || "",
			route: ev.route || "",
			description: ev.description || "",
			max_people: String(ev.max_people || 30),
			cover_image: ev.cover_image || "",
		});
		setFormFields(fields);
		setCoverLocalPath(ev.cover_image ? `${BASE_URL}${ev.cover_image}` : "");
		setEditingEventId(null);
		setEventSubTab("create");
		Taro.showToast({ title: "已复制，请修改后提交", icon: "none" });
	};

	const handleDeleteEvent = (ev: AdminEvent) => {
		Taro.showModal({
			title: "删除活动",
			content: `确认删除「${ev.title}」？\n仅无报名记录的活动可删除，此操作不可恢复。`,
			confirmText: "删除",
			cancelText: "取消",
			confirmColor: "#ff4444",
			success: async (res) => {
				if (!res.confirm) return;
				try {
					await request({ url: `/events/${ev.id}`, method: "DELETE" });
					Taro.showToast({ title: "已删除", icon: "success" });
					loadAdminEvents();
				} catch (e: any) {
					Taro.showToast({
						title: e?.message || "已有用户报名，请先下架",
						icon: "none",
					});
				}
			},
		});
	};

	const handleViewEventRegs = async (event: AdminEvent) => {
		setSelectedEvent(event);
		setEventRegsFilter("pending");
		setEventRegsLoading(true);
		try {
			const data = await request<RegItem[]>({
				url: `/registrations/admin/list?event_id=${event.id}`,
			});
			setEventRegs(data);
		} catch (e: any) {
			Taro.showToast({ title: e?.message || "加载失败", icon: "none" });
		} finally {
			setEventRegsLoading(false);
		}
	};

	const loadUsers = async () => {
		setUsersLoading(true);
		try {
			const data = await request<AdminUser[]>({ url: "/users/admin/list" });
			setUsers(data);
		} catch (e: any) {
			Taro.showToast({ title: e?.message || "加载失败", icon: "none" });
		} finally {
			setUsersLoading(false);
		}
	};

	const handleToggleUserRole = (u: AdminUser) => {
		Taro.showModal({
			title: u.is_admin ? "取消管理员权限" : "设为管理员",
			content: `确认${u.is_admin ? "取消" : "设置"} ${u.nickname} 的管理员权限？`,
			confirmText: "确认",
			cancelText: "取消",
			confirmColor: u.is_admin ? "#ff4444" : "#fff",
			success: async (res) => {
				if (!res.confirm) return;
				try {
					await request({
						url: `/users/admin/${u.id}/role`,
						method: "PATCH",
						data: { is_admin: !u.is_admin },
					});
					Taro.showToast({ title: "已更新", icon: "success" });
					loadUsers();
				} catch (e) {}
			},
		});
	};

	const loadPointsUsers = async () => {
		setPointsLoading(true);
		try {
			const data = await request<UserPointsItem[]>({
				url: "/points/admin/users",
			});
			setPointsUsers(data);
		} catch (e) {
		} finally {
			setPointsLoading(false);
		}
	};

	const handleSelectPointsUser = async (u: UserPointsItem) => {
		setSelectedPointsUser(u);
		setAdjustAmount("");
		setAdjustReason("");
		try {
			const txs = await request<PointsTx[]>({
				url: `/points/admin/users/${u.user_id}/transactions`,
			});
			setUserTxs(txs);
		} catch (e) {}
	};

	const handleAdjust = async () => {
		if (!selectedPointsUser) return;
		const amt = parseInt(adjustAmount);
		if (!adjustAmount || isNaN(amt) || amt === 0) {
			Taro.showToast({
				title: "请输入有效积分数（正数增加，负数减少）",
				icon: "none",
			});
			return;
		}
		if (!adjustReason.trim()) {
			Taro.showToast({ title: "请填写调整原因", icon: "none" });
			return;
		}
		if (adjusting) return;
		setAdjusting(true);
		try {
			await request({
				url: "/points/admin/adjust",
				method: "POST",
				data: {
					user_id: selectedPointsUser.user_id,
					amount: amt,
					reason: adjustReason.trim(),
				},
			});
			Taro.showToast({
				title: amt > 0 ? `+${amt} 积分已发放` : `${amt} 积分已扣减`,
				icon: "success",
			});
			setAdjustAmount("");
			setAdjustReason("");
			// refresh user and txs
			await loadPointsUsers();
			const txs = await request<PointsTx[]>({
				url: `/points/admin/users/${selectedPointsUser.user_id}/transactions`,
			});
			setUserTxs(txs);
			setSelectedPointsUser((u) =>
				u ? { ...u, points_balance: u.points_balance + amt } : u,
			);
		} catch (e: any) {
			Taro.showToast({ title: e?.message || "操作失败", icon: "none" });
		} finally {
			setAdjusting(false);
		}
	};

	const handleTabChange = (t: Tab) => {
		setTab(t);
		if (t === "mall") loadMallData();
		if (t === "event") {
			setSelectedEvent(null);
			loadAdminEvents();
		}
		if (t === "users") {
			setSelectedPointsUser(null);
			loadUsers();
			loadPointsUsers();
		}
	};

	const handleApprove = async (reg: RegItem, onDone: () => void) => {
		try {
			await request({
				url: `/registrations/admin/${reg.id}/approve`,
				method: "PATCH",
			});
			Taro.showToast({ title: "已通过", icon: "success" });
			onDone();
		} catch (e: any) {
			Taro.showToast({ title: e?.message || "操作失败", icon: "none" });
		}
	};

	const handleReject = async (reg: RegItem, onDone: () => void) => {
		Taro.showModal({
			title: "拒绝报名",
			content: `确认拒绝 ${reg.name || reg.user?.nickname || "用户"} 的报名？`,
			confirmText: "确认拒绝",
			cancelText: "取消",
			confirmColor: "#ff4444",
			success: async (res) => {
				if (!res.confirm) return;
				try {
					await request({
						url: `/registrations/admin/${reg.id}/reject`,
						method: "PATCH",
					});
					Taro.showToast({ title: "已拒绝", icon: "none" });
					onDone();
				} catch (e) {}
			},
		});
	};

	const formatDate = (d: string) => {
		const dt = new Date(d);
		return `${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
	};

	// ── Checkin ──
	const handleScan = async () => {
		if (scanning) return;
		setScanning(true);
		try {
			const res = await new Promise<Taro.scanCode.SuccessCallbackResult>(
				(resolve, reject) => {
					Taro.scanCode({
						onlyFromCamera: true,
						scanType: ["qrCode"],
						success: resolve,
						fail: reject,
					});
				},
			);
			const result = await request<CheckinResult>({
				url: "/registrations/checkin",
				method: "POST",
				data: { data: res.result },
			});
			setLastResult(result);
			Taro.showToast({
				title:
					result.message === "Check-in successful" ? "签到成功！" : "已签到",
				icon: "success",
			});
		} catch (e: any) {
			if (!e?.errMsg?.includes("cancel"))
				Taro.showToast({ title: "签到失败", icon: "none" });
		} finally {
			setScanning(false);
		}
	};

	// ── Create Event ──
	const setEField = (key: keyof EventForm) => (e: any) =>
		setEventForm((f) => ({ ...f, [key]: e.detail.value }));

	const pickCover = () => {
		Taro.chooseImage({
			count: 1,
			sizeType: ["compressed"],
			sourceType: ["album", "camera"],
			success: async (res) => {
				const path = res.tempFilePaths[0];
				setCoverLocalPath(path);
				setUploadingCover(true);
				try {
					const uploadRes = await new Promise<any>((resolve, reject) => {
						const timer = setTimeout(() => reject(new Error("timeout")), 30000);
						Taro.uploadFile({
							url: `${BASE_URL}/events/upload-cover`,
							filePath: path,
							name: "file",
							header: { Authorization: `Bearer ${getToken()}` },
							success: (r) => {
								clearTimeout(timer);
								resolve(JSON.parse(r.data));
							},
							fail: (e) => {
								clearTimeout(timer);
								reject(e);
							},
						});
					});
					if (!uploadRes.cover_url) throw new Error("no cover_url");
					setEventForm((f) => ({ ...f, cover_image: uploadRes.cover_url }));
					Taro.showToast({ title: "封面上传成功", icon: "success" });
				} catch (e) {
					Taro.showToast({ title: "上传失败，请重试", icon: "none" });
					setCoverLocalPath("");
				} finally {
					setUploadingCover(false);
				}
			},
			fail: () => {},
		});
	};

	const pickPodcastCover = () => {
		Taro.chooseImage({
			count: 1,
			sizeType: ["compressed"],
			sourceType: ["album", "camera"],
			success: async (res) => {
				const path = res.tempFilePaths[0];
				setPodcastCoverLocalPath(path);
				setUploadingPodcastCover(true);
				try {
					const uploadRes = await new Promise<any>((resolve, reject) => {
						const timer = setTimeout(() => reject(new Error("timeout")), 30000);
						Taro.uploadFile({
							url: `${BASE_URL}/podcasts/upload-cover`,
							filePath: path,
							name: "file",
							header: { Authorization: `Bearer ${getToken()}` },
							success: (r) => {
								clearTimeout(timer);
								resolve(JSON.parse(r.data));
							},
							fail: (e) => {
								clearTimeout(timer);
								reject(e);
							},
						});
					});
					if (!uploadRes.cover_url) throw new Error("no cover_url");
					setPodcastForm((f) => ({ ...f, cover_url: uploadRes.cover_url }));
					Taro.showToast({ title: "封面上传成功", icon: "success" });
				} catch (e) {
					Taro.showToast({ title: "上传失败，请重试", icon: "none" });
					setPodcastCoverLocalPath("");
				} finally {
					setUploadingPodcastCover(false);
				}
			},
			fail: () => {},
		});
	};

	const handleCreateEvent = async () => {
		if (
			!eventForm.title ||
			!eventForm.event_start ||
			!eventForm.signup_start ||
			!eventForm.signup_end ||
			!eventForm.location ||
			!eventForm.route
		) {
			Taro.showToast({ title: "请填写必填项", icon: "none" });
			return;
		}
		if (submitting) return;
		setSubmitting(true);
		try {
			await request({
				url: "/events",
				method: "POST",
				data: {
					title: eventForm.title,
					date: eventForm.event_start,
					signup_start_time: eventForm.signup_start || undefined,
					signup_end_time: eventForm.signup_end || undefined,
					event_start_time: eventForm.event_start || undefined,
					event_end_time: eventForm.event_end || undefined,
					location: eventForm.location,
					route: eventForm.route,
					description: eventForm.description || "暂无详情",
					max_people: parseInt(eventForm.max_people) || 30,
					cover_image: eventForm.cover_image || undefined,
					form_config: { fields: formFields },
				},
			});
			Taro.showToast({ title: "活动创建成功！", icon: "success" });
			setEventForm(EMPTY_EVENT);
			setCoverLocalPath("");
			setFormFields(DEFAULT_FORM_FIELDS.map((f) => ({ ...f })));
			setEventSubTab("list");
			loadAdminEvents();
		} catch (e) {
		} finally {
			setSubmitting(false);
		}
	};

	// ── Upload Podcast ──
	const setPField = (key: keyof PodcastForm) => (e: any) =>
		setPodcastForm((f) => ({ ...f, [key]: e.detail.value }));

	const pickAudio = () => {
		Taro.chooseMessageFile({
			count: 1,
			type: "file",
			extension: ["mp3", "mp4", "m4a", "aac", "wav", "ogg"],
			success: (res) => {
				const file = res.tempFiles[0];
				setAudioFile({ path: file.path, name: file.name });
			},
			fail: () =>
				Taro.showToast({ title: "请从聊天记录选择音频文件", icon: "none" }),
		});
	};

	const handleUploadPodcast = async () => {
		if (!podcastForm.title) {
			Taro.showToast({ title: "请填写标题", icon: "none" });
			return;
		}
		if (!audioFile) {
			Taro.showToast({ title: "请先选择音频文件", icon: "none" });
			return;
		}
		if (uploading) return;
		setUploading(true);
		try {
			const uploadRes = await new Promise<any>((resolve, reject) => {
				Taro.uploadFile({
					url: `${BASE_URL}/podcasts/upload`,
					filePath: audioFile.path,
					name: "file",
					header: { Authorization: `Bearer ${getToken()}` },
					success: (res) => resolve(JSON.parse(res.data)),
					fail: reject,
				});
			});
			await request({
				url: "/podcasts",
				method: "POST",
				data: {
					title: podcastForm.title,
					episode: podcastForm.episode
						? parseInt(podcastForm.episode)
						: undefined,
					description: podcastForm.description || undefined,
					audio_url: uploadRes.audio_url,
					cover_url: podcastForm.cover_url || undefined,
				},
			});
			Taro.showToast({ title: "上传成功！", icon: "success" });
			setPodcastForm(EMPTY_PODCAST);
			setAudioFile(null);
			setPodcastCoverLocalPath("");
		} catch (e) {
			Taro.showToast({ title: "上传失败，请重试", icon: "none" });
		} finally {
			setUploading(false);
		}
	};

	// ── Reg list (shared between global regs tab and per-event view) ──
	const renderRegList = (list: RegItem[], onRefresh: () => void) => (
		<ScrollView scrollY className="regs-scroll">
			{list.map((reg) => (
				<View key={reg.id} className="reg-admin-item">
					<View className="reg-admin-top">
						<View className="reg-admin-info">
							<Text className="reg-admin-name">
								{reg.name || reg.user?.nickname || "—"}
							</Text>
							<Text className="reg-admin-phone">{reg.phone || "—"}</Text>
						</View>
						<View className={`reg-admin-badge ${reg.status}`}>
							<Text className="reg-admin-badge-text">
								{reg.status === "pending"
									? "待审核"
									: reg.status === "approved"
										? "已通过"
										: reg.status === "checked_in"
											? "已签到"
											: reg.status === "rejected"
												? "已拒绝"
												: "已取消"}
							</Text>
						</View>
					</View>
					<View className="reg-admin-meta">
						{reg.pace && <Text className="reg-admin-tag">{reg.pace}</Text>}
						{reg.distance && (
							<Text className="reg-admin-tag">{reg.distance}</Text>
						)}
						{reg.event && !selectedEvent && (
							<Text className="reg-admin-tag">{reg.event.title}</Text>
						)}
						<Text className="reg-admin-date">{formatDate(reg.created_at)}</Text>
					</View>
					<View
						onClick={() =>
							setExpandedRegId(expandedRegId === reg.id ? null : reg.id)
						}
						style="padding:8rpx 0;"
					>
						<Text style="font-size:22rpx;color:#444;">
							{expandedRegId === reg.id ? "▲ 收起" : "▼ 查看详情"}
						</Text>
					</View>
					{expandedRegId === reg.id && reg.form_data && (
						<View style="background:#0a0a0a;border-radius:8rpx;padding:16rpx;margin-bottom:12rpx;">
							{Object.entries(reg.form_data).map(([k, v]) =>
								v ? (
									<View key={k} style="display:flex;gap:16rpx;padding:6rpx 0;">
										<Text style="font-size:22rpx;color:#555;width:140rpx;flex-shrink:0;">
											{k}
										</Text>
										<Text style="font-size:22rpx;color:#aaa;flex:1;">
											{String(v)}
										</Text>
									</View>
								) : null,
							)}
						</View>
					)}
					{reg.status === "pending" && (
						<View className="reg-admin-actions">
							<View
								className="reg-approve-btn"
								onClick={() => handleApprove(reg, onRefresh)}
							>
								<Text className="reg-admin-action-text">✓ 通过</Text>
							</View>
							<View
								className="reg-reject-btn"
								onClick={() => handleReject(reg, onRefresh)}
							>
								<Text className="reg-admin-action-text">✕ 拒绝</Text>
							</View>
						</View>
					)}
				</View>
			))}
			{list.length === 0 && <Text className="empty-hint">暂无报名记录</Text>}
		</ScrollView>
	);

	return (
		<View className="admin-page">
			<View className="admin-header">
				<Text className="admin-title">ADMIN</Text>
				<View className="tab-bar">
					{(["scan", "event", "podcast", "mall", "users"] as Tab[]).map((t) => (
						<View
							key={t}
							className={`tab-item ${tab === t ? "active" : ""}`}
							onClick={() => handleTabChange(t)}
						>
							<Text className="tab-text">
								{t === "scan"
									? "签到"
									: t === "event"
										? "活动"
										: t === "podcast"
											? "播客"
											: t === "mall"
												? "商城"
												: "用户"}
							</Text>
						</View>
					))}
				</View>
			</View>

			{/* ── 签到 ── */}
			{tab === "scan" && (
				<View className="scan-area">
					<View className="scan-btn" onClick={handleScan}>
						<View className="scan-icon">
							<View className="scan-corner tl" />
							<View className="scan-corner tr" />
							<View className="scan-corner bl" />
							<View className="scan-corner br" />
							<Text className="scan-icon-text">扫</Text>
						</View>
						<Text className="scan-label">
							{scanning ? "扫描中..." : "点击扫描签到二维码"}
						</Text>
					</View>
					{lastResult && (
						<View className="result-card">
							<Text className="result-title">
								{lastResult.message === "Check-in successful"
									? "✓ 签到成功"
									: "已签到"}
							</Text>
							<View className="result-divider" />
							{lastResult.registration.user && (
								<View className="result-row">
									<Text className="result-label">跑者</Text>
									<Text className="result-value">
										{lastResult.registration.user.nickname}
									</Text>
								</View>
							)}
							{lastResult.registration.event && (
								<View className="result-row">
									<Text className="result-label">活动</Text>
									<Text className="result-value">
										{lastResult.registration.event.title}
									</Text>
								</View>
							)}
							{lastResult.registration.pace && (
								<View className="result-row">
									<Text className="result-label">配速</Text>
									<Text className="result-value">
										{lastResult.registration.pace}
									</Text>
								</View>
							)}
						</View>
					)}
				</View>
			)}

			{/* ── 活动管理 ── */}
			{tab === "event" && (
				<View>
					{/* Sub-tabs — hidden when drilling into event regs */}
					{!selectedEvent && (
						<View className="mall-sub-tabs">
							<View
								className={`sub-tab ${eventSubTab === "list" ? "active" : ""}`}
								onClick={() => {
									setEventSubTab("list");
									setEditingEventId(null);
								}}
							>
								<Text className="sub-tab-text">活动列表</Text>
							</View>
							<View
								className={`sub-tab ${eventSubTab === "create" ? "active" : ""}`}
								onClick={() => {
									const dt = getDefaultDateTimes();
									setEventSubTab("create");
									setEditingEventId(null);
									setEventForm({
										...EMPTY_EVENT,
										signup_start: dt.signupStartIso,
										signup_end: dt.signupEndIso,
										event_start: dt.eventStartIso,
										event_end: dt.eventEndIso,
									});
									setCoverLocalPath("");
									setFormFields(DEFAULT_FORM_FIELDS.map((f) => ({ ...f })));
								}}
							>
								<Text className="sub-tab-text">创建活动</Text>
							</View>
							{eventSubTab === "edit" && (
								<View className="sub-tab active">
									<Text className="sub-tab-text">编辑活动</Text>
								</View>
							)}
						</View>
					)}

					{/* Per-event registration view */}
					{selectedEvent && (
						<View className="regs-admin">
							{/* 顶部：返回 + 活动名 + 刷新 */}
							<View className="regs-filter-bar">
								<View
									onClick={() => setSelectedEvent(null)}
									style="padding:10rpx 20rpx 10rpx 0;"
								>
									<Text style="color:#888;font-size:26rpx;">← 返回</Text>
								</View>
								<Text
									style="flex:1;font-size:24rpx;color:#fff;font-weight:600;"
									numberOfLines={1}
								>
									{selectedEvent.title}
								</Text>
								<View
									className="regs-refresh"
									onClick={() => handleViewEventRegs(selectedEvent)}
								>
									<Text className="regs-refresh-text">刷新</Text>
								</View>
							</View>

							{/* 人数统计 */}
							<View style="display:flex;gap:24rpx;padding:16rpx 40rpx;border-bottom:1rpx solid #1a1a1a;">
								<Text style="font-size:22rpx;color:#aaa;">
									已通过{" "}
									<Text style="color:#fff;font-weight:700;">
										{
											eventRegs.filter(
												(r) =>
													r.status === "approved" || r.status === "checked_in",
											).length
										}
									</Text>
									{selectedEvent.registration_count !== undefined
										? ` / ${(selectedEvent as any).max_people || "—"}`
										: ""}
								</Text>
								<Text style="font-size:22rpx;color:#aaa;">
									待审核{" "}
									<Text style="color:#f5a623;font-weight:700;">
										{eventRegs.filter((r) => r.status === "pending").length}
									</Text>
								</Text>
								<Text style="font-size:22rpx;color:#aaa;">
									共 <Text style="color:#555;">{eventRegs.length}</Text> 人
								</Text>
							</View>

							{/* 筛选栏 */}
							<View
								className="regs-filter-bar"
								style="border-bottom:1rpx solid #1a1a1a;"
							>
								{(["pending", "approved", "all"] as const).map((f) => (
									<View
										key={f}
										className={`regs-filter-item ${eventRegsFilter === f ? "active" : ""}`}
										onClick={() => setEventRegsFilter(f)}
									>
										<Text className="regs-filter-text">
											{f === "pending"
												? "待审核"
												: f === "approved"
													? "已通过"
													: "全部"}
										</Text>
									</View>
								))}
							</View>

							{eventRegsLoading ? (
								<View className="loading">
									<Text className="loading-text">LOADING...</Text>
								</View>
							) : (
								renderRegList(
									eventRegs.filter(
										(r) =>
											eventRegsFilter === "all" || r.status === eventRegsFilter,
									),
									() => handleViewEventRegs(selectedEvent),
								)
							)}
						</View>
					)}

					{/* Activity list */}
					{!selectedEvent && eventSubTab === "list" && (
						<View>
							<View style="display:flex;align-items:center;padding:16rpx 40rpx;border-bottom:1rpx solid #1a1a1a;">
								<Text style="font-size:22rpx;color:#555;letter-spacing:2px;flex:1;">
									共 {adminEvents.length} 个活动
								</Text>
								<View onClick={loadAdminEvents} style="padding:10rpx 20rpx;">
									<Text style="font-size:22rpx;color:#555;">刷新</Text>
								</View>
							</View>
							{eventsLoading ? (
								<View className="loading">
									<Text className="loading-text">LOADING...</Text>
								</View>
							) : (
								<View style="padding: 0 40rpx;">
									{adminEvents.map((ev) => {
										const d = new Date(ev.date);
										const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
										const isDeleted = ev.status === "deleted";
										const isOffline = ev.status === "offline";
										const isPublished = ev.status === "published";
										const isDraft = ev.status === "draft";
										const hasRegs = (ev.registration_count ?? 0) > 0;

										const statusColor = isDeleted
											? "#555"
											: isOffline
												? "#f5a623"
												: isPublished
													? "#4caf50"
													: "#888";
										const statusLabel = isDeleted
											? "已删除"
											: isOffline
												? "已下架"
												: isPublished
													? "已发布"
													: "草稿";

										return (
											<View
												key={ev.id}
												className="reg-admin-item"
												style={isDeleted ? "opacity:0.5;" : ""}
											>
												<View className="reg-admin-top">
													<View className="reg-admin-info">
														<Text className="reg-admin-name">{ev.title}</Text>
														<Text className="reg-admin-phone">
															{dateStr} · {ev.registration_count ?? 0} 人报名
														</Text>
													</View>
													<View
														style={`padding:6rpx 16rpx;border:1rpx solid ${statusColor};border-radius:4rpx;`}
													>
														<Text
															style={`font-size:20rpx;color:${statusColor};`}
														>
															{statusLabel}
														</Text>
													</View>
												</View>

												{/* 操作按钮行 */}
												{!isDeleted && (
													<View style="display:flex;align-items:center;gap:12rpx;margin-top:16rpx;flex-wrap:wrap;">
														{/* 编辑按钮：未结束且未删除均可编辑 */}
														{new Date(ev.date) >= new Date() && (
															<View
																style="padding:10rpx 20rpx;border:1rpx solid #888;border-radius:8rpx;"
																onClick={() => handleEditEvent(ev)}
															>
																<Text style="font-size:22rpx;color:#ccc;">
																	编辑
																</Text>
															</View>
														)}

														{/* 复制按钮 */}
														<View
															style="padding:10rpx 20rpx;border:1rpx solid #444;border-radius:8rpx;"
															onClick={() => handleCopyEvent(ev)}
														>
															<Text style="font-size:22rpx;color:#888;">
																复制
															</Text>
														</View>

														{/* 下架按钮：发布中或草稿均可下架 */}
														{(isPublished || isDraft) && (
															<View
																style="padding:10rpx 20rpx;border:1rpx solid #f5a623;border-radius:8rpx;"
																onClick={() => handleSetOffline(ev)}
															>
																<Text style="font-size:22rpx;color:#f5a623;">
																	下架
																</Text>
															</View>
														)}

														{/* 删除按钮：无报名记录时可删 */}
														{!hasRegs && !isPublished && (
															<View
																style="padding:10rpx 20rpx;border:1rpx solid #ff4444;border-radius:8rpx;"
																onClick={() => handleDeleteEvent(ev)}
															>
																<Text style="font-size:22rpx;color:#ff4444;">
																	删除
																</Text>
															</View>
														)}

														<View style="flex:1;" />
														<View
															style="padding:10rpx 24rpx;background:#1a1a1a;border-radius:8rpx;"
															onClick={() => handleViewEventRegs(ev)}
														>
															<Text style="font-size:22rpx;color:#ccc;">
																查看报名 →
															</Text>
														</View>
													</View>
												)}
											</View>
										);
									})}
									{adminEvents.length === 0 && (
										<Text className="empty-hint">暂无活动</Text>
									)}
								</View>
							)}
						</View>
					)}

					{/* Create / Edit event form */}
					{!selectedEvent &&
						(eventSubTab === "create" || eventSubTab === "edit") && (
							<ScrollView scrollY className="form-scroll">
								<View className="form-body">
									{/* 活动名称 */}
									<View className="form-item">
										<Text className="form-label">活动名称 *</Text>
										<Input
											className="form-input"
											value={eventForm.title}
											onInput={setEField("title")}
											placeholder="例：东湖夜跑 Vol.12"
											placeholderClass="input-placeholder"
										/>
									</View>

									{/* ── 报名时间 ── */}
									<View className="form-time-group">
										<Text className="form-time-group-label">报名时间</Text>
										<View className="form-item">
											<Text className="form-label">开始时间 *</Text>
											<View className="picker-row">
												<Picker
													mode="date"
													value={getDatePart(eventForm.signup_start)}
													onChange={(e: any) => {
														const d = e.detail.value as string;
														const t =
															getTimePart(eventForm.signup_start) || "08:00";
														setEventForm((f) => ({
															...f,
															signup_start: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getDatePart(eventForm.signup_start) ? " picker-placeholder" : ""}`}
														>
															{getDatePart(eventForm.signup_start) ||
																"选择日期"}
														</Text>
													</View>
												</Picker>
												<Picker
													mode="time"
													value={getTimePart(eventForm.signup_start)}
													onChange={(e: any) => {
														const t = e.detail.value as string;
														const d = getDatePart(eventForm.signup_start);
														setEventForm((f) => ({
															...f,
															signup_start: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getTimePart(eventForm.signup_start) ? " picker-placeholder" : ""}`}
														>
															{getTimePart(eventForm.signup_start) ||
																"选择时间"}
														</Text>
													</View>
												</Picker>
											</View>
										</View>
										<View className="form-item">
											<Text className="form-label">截止时间 *</Text>
											<View className="picker-row">
												<Picker
													mode="date"
													value={getDatePart(eventForm.signup_end)}
													onChange={(e: any) => {
														const d = e.detail.value as string;
														const t =
															getTimePart(eventForm.signup_end) || "07:30";
														setEventForm((f) => ({
															...f,
															signup_end: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getDatePart(eventForm.signup_end) ? " picker-placeholder" : ""}`}
														>
															{getDatePart(eventForm.signup_end) || "选择日期"}
														</Text>
													</View>
												</Picker>
												<Picker
													mode="time"
													value={getTimePart(eventForm.signup_end)}
													onChange={(e: any) => {
														const t = e.detail.value as string;
														const d =
															getDatePart(eventForm.signup_end) ||
															getDatePart(eventForm.signup_start);
														setEventForm((f) => ({
															...f,
															signup_end: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getTimePart(eventForm.signup_end) ? " picker-placeholder" : ""}`}
														>
															{getTimePart(eventForm.signup_end) || "选择时间"}
														</Text>
													</View>
												</Picker>
											</View>
										</View>
									</View>

									{/* ── 活动时间 ── */}
									<View className="form-time-group">
										<Text className="form-time-group-label">活动时间</Text>
										<View className="form-item">
											<Text className="form-label">开始时间 *</Text>
											<View className="picker-row">
												<Picker
													mode="date"
													value={getDatePart(eventForm.event_start)}
													onChange={(e: any) => {
														const d = e.detail.value as string;
														const t =
															getTimePart(eventForm.event_start) || "08:00";
														setEventForm((f) => ({
															...f,
															event_start: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getDatePart(eventForm.event_start) ? " picker-placeholder" : ""}`}
														>
															{getDatePart(eventForm.event_start) || "选择日期"}
														</Text>
													</View>
												</Picker>
												<Picker
													mode="time"
													value={getTimePart(eventForm.event_start)}
													onChange={(e: any) => {
														const t = e.detail.value as string;
														const d = getDatePart(eventForm.event_start);
														setEventForm((f) => ({
															...f,
															event_start: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getTimePart(eventForm.event_start) ? " picker-placeholder" : ""}`}
														>
															{getTimePart(eventForm.event_start) || "选择时间"}
														</Text>
													</View>
												</Picker>
											</View>
										</View>
										<View className="form-item">
											<Text className="form-label">结束时间 *</Text>
											<View className="picker-row">
												<Picker
													mode="date"
													value={getDatePart(eventForm.event_end)}
													onChange={(e: any) => {
														const d = e.detail.value as string;
														const t =
															getTimePart(eventForm.event_end) || "10:00";
														setEventForm((f) => ({
															...f,
															event_end: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getDatePart(eventForm.event_end) ? " picker-placeholder" : ""}`}
														>
															{getDatePart(eventForm.event_end) || "选择日期"}
														</Text>
													</View>
												</Picker>
												<Picker
													mode="time"
													value={getTimePart(eventForm.event_end)}
													onChange={(e: any) => {
														const t = e.detail.value as string;
														const d =
															getDatePart(eventForm.event_end) ||
															getDatePart(eventForm.event_start);
														setEventForm((f) => ({
															...f,
															event_end: combineDateTime(d, t),
														}));
													}}
												>
													<View className="picker-display">
														<Text
															className={`picker-value-text${!getTimePart(eventForm.event_end) ? " picker-placeholder" : ""}`}
														>
															{getTimePart(eventForm.event_end) || "选择时间"}
														</Text>
													</View>
												</Picker>
											</View>
										</View>
									</View>

									{/* 集合地点 / 路线 / 人数 */}
									{[
										{
											key: "location",
											label: "集合地点 *",
											placeholder: "例：东湖公园南门",
										},
										{
											key: "route",
											label: "路线 *",
											placeholder: "例：东湖环线 10KM",
										},
										{ key: "max_people", label: "人数上限", placeholder: "30" },
									].map(({ key, label, placeholder }) => (
										<View key={key} className="form-item">
											<Text className="form-label">{label}</Text>
											<Input
												className="form-input"
												value={(eventForm as any)[key]}
												onInput={setEField(key as keyof EventForm)}
												placeholder={placeholder}
												placeholderClass="input-placeholder"
											/>
										</View>
									))}
									<View className="form-item">
										<Text className="form-label">活动详情</Text>
										<View className="textarea-wrap">
											<Textarea
												className="form-textarea"
												value={eventForm.description}
												onInput={setEField("description")}
												placeholder="活动说明..."
												placeholderClass="input-placeholder"
												maxlength={500}
											/>
										</View>
									</View>

									<View className="form-item">
										<Text className="form-label">
											活动封面 <Text className="form-label-hint">3:4 比例</Text>
										</Text>
										<View className="cover-picker" onClick={pickCover}>
											{coverLocalPath ? (
												<View className="cover-preview-wrap">
													<Image
														src={coverLocalPath}
														className="cover-preview-img"
														mode="aspectFill"
														lazyLoad
													/>
													{uploadingCover && (
														<View className="cover-uploading-mask">
															<Text className="cover-uploading-text">
																上传中...
															</Text>
														</View>
													)}
													{!uploadingCover && eventForm.cover_image && (
														<View className="cover-done-badge">
															<Text className="cover-done-text">✓</Text>
														</View>
													)}
												</View>
											) : (
												<View className="cover-placeholder">
													<Text className="cover-add">＋</Text>
													<Text className="cover-hint">点击上传封面图</Text>
													<Text className="cover-ratio">建议 3:4 竖版</Text>
												</View>
											)}
										</View>
									</View>

									<View className="form-item">
										<Text className="form-label">报名字段配置</Text>
										{formFields.map((field, idx) => (
											<View
												key={field.key}
												style="display:flex;align-items:center;padding:16rpx 0;border-bottom:1rpx solid #1a1a1a;"
											>
												<Text style="flex:1;font-size:26rpx;color:#ccc;">
													{field.label}
												</Text>
												<View style="display:flex;align-items:center;gap:20rpx;">
													<View
														style={`padding:6rpx 18rpx;border-radius:4rpx;border:1rpx solid ${field.enabled ? "#fff" : "#333"};background:${field.enabled ? "#fff" : "transparent"};`}
														onClick={() =>
															setFormFields((fs) =>
																fs.map((f, i) =>
																	i === idx
																		? {
																				...f,
																				enabled: !f.enabled,
																				required: !f.enabled
																					? f.required
																					: false,
																			}
																		: f,
																),
															)
														}
													>
														<Text
															style={`font-size:22rpx;color:${field.enabled ? "#000" : "#555"};`}
														>
															启用
														</Text>
													</View>
													{field.enabled && (
														<View
															style={`padding:6rpx 18rpx;border-radius:4rpx;border:1rpx solid ${field.required ? "#f5a623" : "#333"};background:${field.required ? "rgba(245,166,35,0.15)" : "transparent"};`}
															onClick={() =>
																setFormFields((fs) =>
																	fs.map((f, i) =>
																		i === idx
																			? { ...f, required: !f.required }
																			: f,
																	),
																)
															}
														>
															<Text
																style={`font-size:22rpx;color:${field.required ? "#f5a623" : "#555"};`}
															>
																必填
															</Text>
														</View>
													)}
												</View>
											</View>
										))}
									</View>

									<View
										className={`submit-btn ${submitting || uploadingCover ? "disabled" : ""}`}
										onClick={
											eventSubTab === "edit"
												? handleUpdateEvent
												: handleCreateEvent
										}
									>
										<Text className="submit-text">
											{submitting
												? eventSubTab === "edit"
													? "保存中..."
													: "创建中..."
												: eventSubTab === "edit"
													? "保存修改"
													: "创建活动"}
										</Text>
									</View>
								</View>
							</ScrollView>
						)}
				</View>
			)}

			{/* ── 播客 ── */}
			{tab === "podcast" && (
				<ScrollView scrollY className="form-scroll">
					<View className="form-body">
						<View className="form-item">
							<Text className="form-label">播客标题 *</Text>
							<Input
								className="form-input"
								value={podcastForm.title}
								onInput={setPField("title")}
								placeholder="例：跑步的意义"
								placeholderClass="input-placeholder"
							/>
						</View>
						<View className="form-item">
							<Text className="form-label">期数</Text>
							<Input
								className="form-input"
								value={podcastForm.episode}
								onInput={setPField("episode")}
								type="number"
								placeholder="例：1"
								placeholderClass="input-placeholder"
							/>
						</View>
						<View className="form-item">
							<Text className="form-label">简介</Text>
							<View className="textarea-wrap">
								<Textarea
									className="form-textarea"
									value={podcastForm.description}
									onInput={setPField("description")}
									placeholder="本期内容简介..."
									placeholderClass="input-placeholder"
									maxlength={300}
								/>
							</View>
						</View>

						<View className="form-item">
							<Text className="form-label">
								播客封面 <Text className="form-label-hint">4:3 比例</Text>
							</Text>
							<View className="podcast-cover-picker" onClick={pickPodcastCover}>
								{podcastCoverLocalPath ? (
									<View className="cover-preview-wrap">
										<Image
											src={podcastCoverLocalPath}
											className="cover-preview-img"
											mode="aspectFill"
											lazyLoad
										/>
										{uploadingPodcastCover && (
											<View className="cover-uploading-mask">
												<Text className="cover-uploading-text">上传中...</Text>
											</View>
										)}
										{!uploadingPodcastCover && podcastForm.cover_url && (
											<View className="cover-done-badge">
												<Text className="cover-done-text">✓</Text>
											</View>
										)}
									</View>
								) : (
									<View className="cover-placeholder">
										<Text className="cover-add">＋</Text>
										<Text className="cover-hint">点击上传封面图</Text>
										<Text className="cover-ratio">建议 4:3 横版</Text>
									</View>
								)}
							</View>
						</View>

						<View className="audio-picker" onClick={pickAudio}>
							{audioFile ? (
								<View className="audio-selected">
									<Text className="audio-icon">🎵</Text>
									<Text className="audio-name">{audioFile.name}</Text>
								</View>
							) : (
								<View className="audio-placeholder">
									<Text className="audio-add">＋</Text>
									<Text className="audio-hint">从聊天记录选择音频文件</Text>
									<Text className="audio-fmt">支持 MP3、M4A、AAC、WAV</Text>
								</View>
							)}
						</View>

						<View
							className={`submit-btn ${uploading ? "disabled" : ""}`}
							onClick={handleUploadPodcast}
						>
							<Text className="submit-text">
								{uploading ? "上传中..." : "上传播客"}
							</Text>
						</View>
					</View>
				</ScrollView>
			)}

			{/* ── 商城 ── */}
			{tab === "mall" && (
				<View className="mall-admin">
					<View className="mall-sub-tabs">
						<View
							className={`sub-tab ${mallTab === "products" ? "active" : ""}`}
							onClick={() => setMallTab("products")}
						>
							<Text className="sub-tab-text">商品管理</Text>
						</View>
						<View
							className={`sub-tab ${mallTab === "orders" ? "active" : ""}`}
							onClick={() => setMallTab("orders")}
						>
							<Text className="sub-tab-text">兑换订单</Text>
						</View>
					</View>

					{mallLoading ? (
						<View className="loading">
							<Text className="loading-text">LOADING...</Text>
						</View>
					) : mallTab === "products" ? (
						<ScrollView scrollY className="mall-scroll">
							<View className="form-body">
								<Text className="section-label">新增商品</Text>
								<View className="form-item">
									<Text className="form-label">商品名称 *</Text>
									<Input
										className="form-input"
										value={productForm.name}
										onInput={setPField2("name")}
										placeholder="例：DRC 限定周边"
										placeholderClass="input-placeholder"
									/>
								</View>
								<View className="form-item">
									<Text className="form-label">所需积分 *</Text>
									<Input
										className="form-input"
										value={productForm.points_cost}
										onInput={setPField2("points_cost")}
										type="number"
										placeholder="例：100"
										placeholderClass="input-placeholder"
									/>
								</View>
								<View className="form-item">
									<Text className="form-label">库存数量 *</Text>
									<Input
										className="form-input"
										value={productForm.stock}
										onInput={setPField2("stock")}
										type="number"
										placeholder="例：50"
										placeholderClass="input-placeholder"
									/>
								</View>
								<View className="form-item">
									<Text className="form-label">商品类型</Text>
									<View style="display:flex;gap:12rpx;flex-wrap:wrap;margin-top:4rpx;">
										{(
											[
												["normal", "普通商品"],
												["apparel", "服饰"],
												["shoes", "鞋子"],
												["virtual", "虚拟"],
											] as [string, string][]
										).map(([val, label]) => (
											<View
												key={val}
												style={`padding:10rpx 22rpx;border-radius:6rpx;border:1rpx solid ${productForm.product_type === val ? "#fff" : "#333"};background:${productForm.product_type === val ? "#fff" : "transparent"};`}
												onClick={() =>
													setProductForm((f) => ({ ...f, product_type: val }))
												}
											>
												<Text
													style={`font-size:24rpx;color:${productForm.product_type === val ? "#000" : "#555"};`}
												>
													{label}
												</Text>
											</View>
										))}
									</View>
								</View>
								{(productForm.product_type === "apparel" ||
									productForm.product_type === "shoes") && (
									<View className="form-item">
										<Text className="form-label">
											尺码选项
											<Text className="form-label-hint">
												{productForm.product_type === "apparel"
													? "默认 S,M,L,XL"
													: "默认 36–45"}
												，逗号分隔自定义
											</Text>
										</Text>
										<Input
											className="form-input"
											value={productForm.size_options}
											onInput={setPField2("size_options")}
											placeholder={
												productForm.product_type === "apparel"
													? "S,M,L,XL"
													: "36,37,38,39,40,41,42,43,44,45"
											}
											placeholderClass="input-placeholder"
										/>
									</View>
								)}
								<View
									className={`submit-btn ${creatingProduct ? "disabled" : ""}`}
									onClick={handleCreateProduct}
								>
									<Text className="submit-text">
										{creatingProduct ? "创建中..." : "新增商品"}
									</Text>
								</View>
							</View>

							<View className="products-admin-list">
								<Text className="section-label">商品列表</Text>
								{products.length === 0 ? (
									<Text className="empty-hint">暂无商品</Text>
								) : (
									products.map((p) => (
										<View key={p.id} className="product-admin-item">
											<View className="product-admin-info">
												<Text className="product-admin-name">{p.name}</Text>
												<Text className="product-admin-meta">
													{p.points_cost}积分 · 库存{p.stock}
													{p.product_type && p.product_type !== "normal"
														? ` · ${p.product_type === "apparel" ? "服饰" : p.product_type === "shoes" ? "鞋子" : "虚拟"}`
														: ""}
													{p.size_options?.length
														? ` [${p.size_options.join("/")}]`
														: ""}
												</Text>
											</View>
											<View className="product-admin-actions">
												<View
													className={`product-toggle ${p.status === "active" ? "on" : "off"}`}
													onClick={() => handleToggleProduct(p)}
												>
													<Text className="product-toggle-text">
														{p.status === "active" ? "上架" : "下架"}
													</Text>
												</View>
												<View
													className="product-del"
													onClick={() => handleDeleteProduct(p)}
												>
													<Text className="product-del-text">删除</Text>
												</View>
											</View>
										</View>
									))
								)}
							</View>
						</ScrollView>
					) : (
						<ScrollView scrollY className="mall-scroll">
							<View className="orders-admin-list">
								{mallOrders.length === 0 ? (
									<Text className="empty-hint">暂无订单</Text>
								) : (
									mallOrders.map((order) => (
										<View key={order.id} className="order-admin-item">
											<View className="order-admin-info">
												<Text className="order-admin-product">
													{order.product?.name || "商品"}
												</Text>
												<Text className="order-admin-user">
													{order.user?.nickname || "用户"} ·{" "}
													{order.points_spent}积分
													{order.size ? ` · 码：${order.size}` : ""} ·{" "}
													{order.delivery_type === "pickup"
														? "自提"
														: order.delivery_type === "virtual"
															? "虚拟"
															: "邮寄"}
												</Text>
												{order.address_name && (
													<Text className="order-admin-addr">
														{order.address_name} {order.address_phone}{" "}
														{order.address_detail}
													</Text>
												)}
											</View>
											{order.status === "pending" && (
												<View className="order-admin-actions">
													<View
														className="order-complete-btn"
														onClick={() =>
															handleUpdateOrderStatus(order.id, "completed")
														}
													>
														<Text className="order-action-text">完成</Text>
													</View>
													<View
														className="order-cancel-btn"
														onClick={() =>
															handleUpdateOrderStatus(order.id, "cancelled")
														}
													>
														<Text className="order-action-text">取消</Text>
													</View>
												</View>
											)}
											{order.status !== "pending" && (
												<Text
													className={`order-status-text ${order.status === "completed" ? "done" : "cancel"}`}
												>
													{order.status === "completed" ? "已完成" : "已取消"}
												</Text>
											)}
										</View>
									))
								)}
							</View>
						</ScrollView>
					)}
				</View>
			)}

			{/* ── 用户管理（含积分） ── */}
			{tab === "users" && (
				<View style="display:flex;flex-direction:column;height:calc(100vh - 200rpx);">
					{/* Header */}
					<View style="display:flex;align-items:center;padding:16rpx 40rpx;border-bottom:1rpx solid #1a1a1a;gap:16rpx;">
						{selectedPointsUser ? (
							<>
								<View
									onClick={() => setSelectedPointsUser(null)}
									style="padding:10rpx 20rpx 10rpx 0;"
								>
									<Text style="color:#888;font-size:26rpx;">← 返回</Text>
								</View>
								<Text style="font-size:24rpx;color:#fff;font-weight:600;flex:1;">
									{selectedPointsUser.user?.nickname ||
										`用户${selectedPointsUser.user_id}`}
								</Text>
								<Text style="font-size:28rpx;color:#4ade80;font-weight:700;">
									{selectedPointsUser.points_balance} 分
								</Text>
							</>
						) : (
							<>
								<Input
									style="flex:1;background:#111;border-radius:8rpx;padding:12rpx 20rpx;font-size:26rpx;color:#fff;border:1rpx solid #222;height:64rpx;"
									value={pointsSearch}
									onInput={(e) => setPointsSearch(e.detail.value)}
									placeholder="搜索用户名..."
									placeholderStyle="color:#444;"
								/>
								<View
									onClick={() => {
										loadUsers();
										loadPointsUsers();
									}}
									style="padding:10rpx 20rpx;"
								>
									<Text style="font-size:22rpx;color:#555;">刷新</Text>
								</View>
							</>
						)}
					</View>

					{/* User list */}
					{!selectedPointsUser &&
						(usersLoading || pointsLoading ? (
							<View className="loading">
								<Text className="loading-text">LOADING...</Text>
							</View>
						) : (
							<ScrollView scrollY style="flex:1;">
								<View style="padding:0 40rpx;">
									{[...users]
										.filter(
											(u) => !pointsSearch || u.nickname.includes(pointsSearch),
										)
										.sort((a, b) => (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0))
										.map((u) => {
											const pts = pointsUsers.find((p) => p.user_id === u.id);
											const balance = pts?.points_balance ?? 0;
											const total = pts?.points_total ?? 0;
											const pointsItem: UserPointsItem = pts ?? {
												id: 0,
												user_id: u.id,
												points_balance: 0,
												points_total: 0,
												user: { id: u.id, nickname: u.nickname },
											};
											return (
												<View key={u.id} className="reg-admin-item">
													<View className="reg-admin-top">
														<View
															className="reg-admin-info"
															onClick={() => handleSelectPointsUser(pointsItem)}
														>
															<View style="display:flex;align-items:center;gap:12rpx;">
																<Text className="reg-admin-name">
																	{u.nickname}
																</Text>
																{u.is_admin && (
																	<View style="background:#fff;border-radius:4rpx;padding:2rpx 10rpx;">
																		<Text style="font-size:18rpx;color:#000;font-weight:700;letter-spacing:1px;">
																			ADMIN
																		</Text>
																	</View>
																)}
															</View>
															<Text className="reg-admin-phone">
																积分 {balance} · 累计 {total}
															</Text>
														</View>
														<View
															className={`product-toggle ${u.is_admin ? "on" : "off"}`}
															onClick={() => handleToggleUserRole(u)}
														>
															<Text className="product-toggle-text">
																{u.is_admin ? "管理员" : "普通"}
															</Text>
														</View>
													</View>
												</View>
											);
										})}
									{users.length === 0 && (
										<Text className="empty-hint">暂无用户</Text>
									)}
								</View>
							</ScrollView>
						))}

					{/* Points detail for selected user */}
					{selectedPointsUser && (
						<ScrollView scrollY style="flex:1;">
							<View style="padding:24rpx 40rpx;">
								<View style="background:#111;border-radius:12rpx;padding:28rpx;margin-bottom:24rpx;">
									<Text style="display:block;font-size:22rpx;color:#555;letter-spacing:3px;margin-bottom:20rpx;">
										手动调整积分
									</Text>
									<View className="form-item" style="margin-bottom:16rpx;">
										<Text className="form-label">
											积分数量（正数增加，负数扣减）
										</Text>
										<Input
											className="form-input"
											value={adjustAmount}
											onInput={(e) => setAdjustAmount(e.detail.value)}
											type="number"
											placeholder="例：50 或 -20"
											placeholderClass="input-placeholder"
										/>
									</View>
									<View className="form-item" style="margin-bottom:20rpx;">
										<Text className="form-label">调整原因 *</Text>
										<Input
											className="form-input"
											value={adjustReason}
											onInput={(e) => setAdjustReason(e.detail.value)}
											placeholder="例：参加线下活动奖励"
											placeholderClass="input-placeholder"
										/>
									</View>
									<View
										className={`submit-btn ${adjusting ? "disabled" : ""}`}
										onClick={handleAdjust}
									>
										<Text className="submit-text">
											{adjusting ? "处理中..." : "确认调整"}
										</Text>
									</View>
								</View>

								<Text style="display:block;font-size:22rpx;color:#444;letter-spacing:3px;margin-bottom:16rpx;">
									积分记录
								</Text>
								{userTxs.length === 0 ? (
									<Text className="empty-hint">暂无记录</Text>
								) : (
									userTxs.map((tx) => (
										<View
											key={tx.id}
											style="display:flex;align-items:center;padding:20rpx 0;border-bottom:1rpx solid #111;"
										>
											<View style="flex:1;min-width:0;">
												<Text style="display:block;font-size:26rpx;color:#ccc;margin-bottom:6rpx;">
													{tx.description || tx.source}
												</Text>
												{tx.reason && (
													<Text style="display:block;font-size:22rpx;color:#555;">
														原因：{tx.reason}
													</Text>
												)}
												<Text style="font-size:20rpx;color:#444;">
													{formatDate(tx.created_at)}
												</Text>
											</View>
											<Text
												style={`font-size:30rpx;font-weight:700;margin-left:16rpx;${tx.points_change > 0 ? "color:#4ade80;" : "color:#f87171;"}`}
											>
												{tx.points_change > 0 ? "+" : ""}
												{tx.points_change}
											</Text>
										</View>
									))
								)}
							</View>
						</ScrollView>
					)}
				</View>
			)}
		</View>
	);
}
