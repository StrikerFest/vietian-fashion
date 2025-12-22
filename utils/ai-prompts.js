// utils/ai-prompts.js

export const DEFAULT_PRODUCT_GENERATE_PROMPT = `Bạn là một chuyên gia quản trị hàng hóa thời trang tại Việt Nam. Hãy phân tích hình ảnh này và trích xuất dữ liệu sản phẩm cho cơ sở dữ liệu thương mại điện tử.

Hãy trả về một JSON object hợp lệ với các trường sau (Tất cả giá trị phải là Tiếng Việt chuẩn):
1. "name": Tên sản phẩm sáng tạo, chuẩn SEO (tối đa 60 ký tự). Ví dụ: "Áo Sơ Mi Oxford Form Rộng".
2. "description": Mô tả marketing hấp dẫn gồm 2-3 câu, tập trung vào lợi ích và phong cách.
3. "category": Danh mục sản phẩm chính xác nhất (Dùng cho menu điều hướng). Ví dụ: "Áo Khoác Bomber", "Đầm Maxi", "Túi Tote".
4. "attributes": Một object chứa các cặp Key-Value về thuộc tính sản phẩm. 
   - Key là Tên Nhóm Thuộc Tính. Ưu tiên sử dụng các nhóm sau nếu phù hợp:
{{attributeList}}
   - Value là Giá trị cụ thể. Có thể là chuỗi hoặc mảng chuỗi (nếu có nhiều giá trị). Ví dụ: "Xanh Navy" hoặc ["Xanh Navy", "Trắng"].
   - Hãy cố gắng trích xuất chi tiết nhất có thể.
5. "price_estimate": Giá bán ước tính bằng VNĐ (số nguyên, ví dụ: 450000).

QUAN TRỌNG: 
- Chỉ trả về JSON thô. Không dùng markdown formatting.
- Ngôn ngữ hoàn toàn là Tiếng Việt.`;

export const DEFAULT_TAGS_PROMPT = `Bạn là một chuyên gia thời trang tại Việt Nam. 
Hãy phân tích hình ảnh, tên và mô tả của sản phẩm này.

Tên: "{{productName}}"
Mô tả: "{{productDescription}}"

Nhiệm vụ của bạn là phân loại sản phẩm này theo các Nhóm Thuộc Tính sau đây:
{{attributeList}}

Hướng dẫn quan trọng:
1. **Ngôn ngữ**: Tất cả các giá trị (values) trả về PHẢI là Tiếng Việt chuẩn.
2. **Định dạng**: Trả về duy nhất một JSON object hợp lệ.
3. **Keys**: Tên các key trong JSON phải KHỚP CHÍNH XÁC với tên Nhóm Thuộc Tính được liệt kê ở trên.
4. **Values**: Giá trị phải là mảng các chuỗi (Array of Strings).
   - Ví dụ: Thay vì "Blue", hãy trả về ["Xanh dương"].
   - Thay vì "Cotton", hãy trả về ["Vải Cotton", "Thoáng mát"].
5. Nếu không xác định được thuộc tính nào, hãy bỏ qua key đó.
6. Không sử dụng markdown code block.

Ví dụ định dạng mong muốn:
{
  "Màu sắc": ["Xanh Navy", "Trắng"],
  "Chất liệu": ["Kaki", "Thun"]
}`;

export const DEFAULT_DESCRIPTION_PROMPT = `Đóng vai trò là một chuyên gia viết nội dung (copywriter) cho một thương hiệu thời trang hiện đại tại Việt Nam.
Viết một đoạn mô tả sản phẩm hấp dẫn, chuẩn SEO cho mặt hàng trong hình ảnh này.

Tên sản phẩm: "{{productName}}"

Hướng dẫn:
- Tập trung vào kiểu dáng, form dáng, chất liệu (quan sát được từ ảnh) và tính ứng dụng.
- Gợi ý dịp sử dụng phù hợp hoặc cách phối đồ nhanh.
- Giọng văn: Tinh tế, chuyên nghiệp, lôi cuốn và thuyết phục.
- Ngôn ngữ: Hoàn toàn bằng Tiếng Việt.
- Độ dài: 3 đến 4 câu văn ngắn gọn, súc tích.
- Không bao gồm tiêu đề hay định dạng markdown, chỉ trả về nội dung đoạn văn.`;