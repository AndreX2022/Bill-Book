package in.billbook.app;
import android.graphics.*;
import android.graphics.pdf.PdfDocument;
import android.util.Base64;
import org.json.*;
import java.io.*;
import java.util.*;

/** Generates a paginated A4 PDF directly from the saved bill snapshot. */
public final class BillPdf {
  private final PdfDocument document=new PdfDocument();
  private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
  private Canvas canvas;private PdfDocument.Page page;private int pageNumber=0;private float y;
  private final String number;private final int ink=Color.rgb(24,46,80),blue=Color.rgb(34,87,220);
  private BillPdf(String number){this.number=number;newPage();}
  private void style(float size,boolean bold,int color){paint.setTextSize(size);paint.setColor(color);paint.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));}
  private void newPage(){if(page!=null)finishPage();page=document.startPage(new PdfDocument.PageInfo.Builder(595,842,++pageNumber).create());canvas=page.getCanvas();y=48;if(pageNumber>1){text("BillBook · "+number+" · continued",11,true);y+=12;}}
  private void finishPage(){style(9,false,Color.GRAY);canvas.drawText("Page "+pageNumber,510,811,paint);document.finishPage(page);page=null;}
  private void room(float height){if(y+height>785)newPage();}
  private List<String> wrap(String value,float width){List<String> lines=new ArrayList<>();for(String paragraph:value.replace('\r',' ').split("\n",-1)){if(paragraph.length()==0){lines.add("");continue;}while(paragraph.length()>0){int n=paint.breakText(paragraph,true,width,null);if(n<1)n=1;if(n<paragraph.length()){int space=paragraph.lastIndexOf(' ',n-1);if(space>0)n=space;}lines.add(paragraph.substring(0,n));paragraph=paragraph.substring(n).trim();}}return lines;}
  private void text(String value,float size,boolean bold){style(size,bold,ink);List<String> lines=wrap(value,511);for(String line:lines){room(size+7);style(size,bold,ink);canvas.drawText(line,42,y,paint);y+=size+6;}}
  private void line(){room(12);paint.setColor(blue);paint.setStrokeWidth(1.4f);canvas.drawLine(42,y,553,y,paint);y+=14;}
  private static String str(JSONObject obj,String key){return obj.optString(key,"");}
  private static String money(double value){return "₹"+String.format(Locale.US,"%,.2f",value);}
  private static String qty(double value){return String.format(Locale.US,"%.3f",value).replaceAll("0+$","").replaceAll("\\.$","");}
  private void pair(String label,String value,boolean bold){room(22);style(bold?14:11,bold,ink);canvas.drawText(label,300,y,paint);float width=paint.measureText(value);canvas.drawText(value,553-width,y,paint);y+=bold?25:20;}
  private void tableHeader(){room(34);paint.setColor(Color.rgb(237,243,255));canvas.drawRect(42,y-12,553,y+10,paint);style(9,true,ink);String[] labels={"Description / HSN","Qty","Rate","Disc.","GST","Amount"};float[] xs={47,270,314,380,430,481};for(int n=0;n<labels.length;n++)canvas.drawText(labels[n],xs[n],y,paint);y+=27;}
  private void item(JSONObject item){style(10,false,ink);String desc=str(item,"description");if(!str(item,"hsnCode").isEmpty())desc+="\nHSN: "+str(item,"hsnCode");List<String> lines=wrap(desc,213);float h=Math.max(31,lines.size()*15+9);if(y+h>785){newPage();tableHeader();}
    // Exceptionally long descriptions continue on additional pages rather than overflow.
    boolean first=true;for(String line:lines){if(y+20>785){newPage();tableHeader();}style(10,false,ink);canvas.drawText(line,47,y,paint);if(first){style(9,false,ink);String[] cells={qty(item.optDouble("quantity")),money(item.optDouble("rate")),qty(item.optDouble("discountPct"))+"%",qty(item.optDouble("gstRate"))+"%",money(item.optDouble("total"))};float[] left={267,308,377,427,475};float[] widths={36,64,45,43,77};for(int n=0;n<cells.length;n++){float size=9;while(size>6&&paint.measureText(cells[n])>widths[n]){size-=.5f;paint.setTextSize(size);}canvas.drawText(cells[n],left[n],y,paint);paint.setTextSize(9);}first=false;}y+=15;}
    y+=9;paint.setColor(Color.rgb(220,228,240));paint.setStrokeWidth(.6f);canvas.drawLine(42,y-3,553,y-3,paint);y+=8;
  }
  private void bank(JSONObject b){if(str(b,"bankAccount").isEmpty()&&str(b,"upi").isEmpty())return;room(155);y+=12;text("Payment details",13,true);String[][] fields={{"Bank","bankName"},{"Account holder","accountHolder"},{"Account number","bankAccount"},{"IFSC","bankIfsc"},{"Branch","bankBranch"},{"UPI ID","upi"}};for(String[] field:fields)if(!str(b,field[1]).isEmpty())text(field[0]+": "+str(b,field[1]),10,false);}
  private void qr(JSONObject b)throws IOException {String data=str(b,"qr");if(data.isEmpty())return;int comma=data.indexOf(',');if(comma<0)throw new IOException("Invalid QR");byte[] bytes=Base64.decode(data.substring(comma+1),Base64.DEFAULT);BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);int sample=1;while(Math.max(options.outWidth,options.outHeight)/sample>2048)sample*=2;options.inSampleSize=sample;options.inJustDecodeBounds=false;Bitmap image=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);if(image==null)throw new IOException("Could not decode QR");float scale=Math.min(135f/image.getWidth(),135f/image.getHeight());float w=image.getWidth()*scale,h=image.getHeight()*scale;room(h+55);y+=15;text("Scan to pay",12,true);paint.setFilterBitmap(true);canvas.drawBitmap(image,null,new RectF(42,y,42+w,y+h),paint);y+=h+20;image.recycle();}
  public static void create(JSONObject invoice,File file)throws Exception {
    BillPdf pdf=new BillPdf(str(invoice,"number"));try{
      JSONObject business=invoice.getJSONObject("business"),customer=invoice.getJSONObject("customer");
      pdf.text(str(business,"name"),23,true);for(String key:new String[]{"address","state","phone","email"})if(!str(business,key).isEmpty())pdf.text(str(business,key),10,false);if(!str(business,"gstin").isEmpty())pdf.text("GSTIN: "+str(business,"gstin"),10,false);pdf.y+=6;pdf.line();
      pdf.text(("BOS".equals(str(invoice,"type"))?"Bill of Supply":"Tax Invoice")+" · "+str(invoice,"number"),15,true);
      if(invoice.optBoolean("cancelled"))pdf.text("CANCELLED",15,true);
      pdf.text("Date: "+str(invoice,"date")+(str(invoice,"dueDate").isEmpty()?"":" · Due: "+str(invoice,"dueDate")),10,false);
      double total=invoice.optDouble("grandTotal"),paid=invoice.optDouble("amountPaid");String status=invoice.optBoolean("cancelled")?"CANCELLED":paid>=total?"PAID":paid>0?"PARTIALLY PAID":"UNPAID";if(!str(invoice,"pdfStatus").isEmpty())status=str(invoice,"pdfStatus").replace('_',' ');pdf.text("Status: "+status,10,false);pdf.y+=10;
      pdf.text("Bill to: "+str(customer,"name"),12,true);for(String key:new String[]{"address","state","phone"})if(!str(customer,key).isEmpty())pdf.text(str(customer,key),10,false);if(!str(customer,"gstin").isEmpty())pdf.text("GSTIN: "+str(customer,"gstin"),10,false);pdf.y+=15;
      pdf.tableHeader();JSONArray items=invoice.getJSONArray("items");for(int n=0;n<items.length();n++)pdf.item(items.getJSONObject(n));pdf.y+=10;pdf.room(155);
      pdf.pair("Subtotal",money(invoice.optDouble("taxableValue")),false);for(String key:new String[]{"cgst","sgst","igst"})if(invoice.optDouble(key)!=0)pdf.pair(key.toUpperCase(Locale.US),money(invoice.optDouble(key)),false);pdf.pair("Round off",money(invoice.optDouble("roundOff")),false);pdf.pair("Total",money(total),true);pdf.pair("Paid",money(paid),false);pdf.pair("Balance",money(invoice.optBoolean("cancelled")?0:Math.max(0,total-paid)),true);
      if(!str(invoice,"notes").isEmpty()){pdf.y+=12;pdf.text("Notes",12,true);pdf.text(str(invoice,"notes"),10,false);}pdf.bank(business);pdf.qr(business);pdf.room(40);pdf.y+=10;pdf.line();pdf.text("Thank you for your business.",10,false);pdf.finishPage();try(FileOutputStream out=new FileOutputStream(file)){pdf.document.writeTo(out);}
    }finally{pdf.document.close();}
  }
}
